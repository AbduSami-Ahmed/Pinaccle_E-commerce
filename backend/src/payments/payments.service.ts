import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MockPaymentGatewayAdapter } from './mock-payment.adapter';
import { StripePaymentGatewayAdapter } from './stripe-payment.adapter';
import { PaymentGatewayAdapter } from './payment-gateway.interface';
import {
  CreatePaymentIntentDto,
  PaymentGatewayProvider,
  PaymentSessionResponseDto,
  PaymentWebhookResultDto,
} from '@pinnacle/contracts';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly defaultProvider: PaymentGatewayProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly mockAdapter: MockPaymentGatewayAdapter,
    private readonly stripeAdapter: StripePaymentGatewayAdapter,
    private readonly config: ConfigService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {
    this.defaultProvider =
      (this.config.get<string>('PAYMENT_DEFAULT_PROVIDER') as PaymentGatewayProvider) || 'MOCK';
  }

  private resolveAdapter(provider?: PaymentGatewayProvider): PaymentGatewayAdapter {
    const chosen = provider || this.defaultProvider;
    if (chosen === 'STRIPE') {
      return this.stripeAdapter;
    }
    return this.mockAdapter;
  }

  // ---------------------------------------------------------------------------
  // 1. Create Payment Session / Intent
  // ---------------------------------------------------------------------------

  async createPaymentSession(dto: CreatePaymentIntentDto): Promise<PaymentSessionResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        stockReservations: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    if (order.paymentStatus === 'PAID') {
      throw new ConflictException(`Order ${order.orderNumber} has already been paid`);
    }

    if (order.orderStatus === 'CANCELLED') {
      throw new BadRequestException(`Order ${order.orderNumber} was cancelled and cannot be paid`);
    }

    // Check if any reservation has expired
    const now = new Date();
    const activeReservations = order.stockReservations.filter((r) => r.status === 'ACTIVE');
    const expiredReservation = activeReservations.find((r) => r.expiresAt < now);

    if (expiredReservation) {
      throw new BadRequestException(
        `Your 15-minute checkout reservation for order ${order.orderNumber} has expired. Please re-add your items.`,
      );
    }

    const adapter = this.resolveAdapter(dto.provider);
    const idempotencyKey = `pi_${order.id}_${Date.now()}`;

    // Invoke payment gateway adapter
    const intentResult = await adapter.createPaymentIntent({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      currency: order.currency,
      customerEmail: order.customerEmail,
      idempotencyKey,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    // Record or update transaction in database
    await this.prisma.paymentTransaction.upsert({
      where: { transactionReference: intentResult.transactionReference },
      create: {
        orderId: order.id,
        provider: intentResult.provider === 'STRIPE' ? 'STRIPE' : 'MANUAL',
        transactionReference: intentResult.transactionReference,
        idempotencyKey,
        amount: order.totalAmount,
        currency: order.currency,
        status: 'PENDING',
        rawResponse: intentResult.rawResponse as any,
      },
      update: {
        amount: order.totalAmount,
        status: 'PENDING',
        rawResponse: intentResult.rawResponse as any,
      },
    });

    let earliestExpiry: Date | null = null;
    for (const curr of activeReservations) {
      if (!earliestExpiry || curr.expiresAt < earliestExpiry) {
        earliestExpiry = curr.expiresAt;
      }
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      provider: intentResult.provider,
      clientSecret: intentResult.clientSecret,
      transactionReference: intentResult.transactionReference,
      amount: Number(order.totalAmount),
      currency: order.currency,
      status: 'PENDING',
      reservationExpiresAt: earliestExpiry ? earliestExpiry.toISOString() : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Verified Server-Side Webhook Handler with Replay Protection
  // ---------------------------------------------------------------------------

  async handleWebhook(
    provider: PaymentGatewayProvider,
    payload: string | Buffer | Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<PaymentWebhookResultDto> {
    const adapter = this.resolveAdapter(provider);

    // Cryptographic signature verification
    const verified = await adapter.verifyWebhook(payload, headers);

    if (!verified.isValid) {
      throw new BadRequestException('Webhook verification failed: invalid signature');
    }

    // Idempotency & Replay Protection: Check if eventId was already processed
    const existingLog = await this.prisma.paymentWebhookLog.findUnique({
      where: { eventId: verified.eventId },
    });

    if (existingLog) {
      this.logger.warn(
        `[PaymentWebhook] Duplicate webhook received for eventId ${verified.eventId}`,
      );
      return {
        received: true,
        duplicate: true,
        status: existingLog.status,
        orderNumber: verified.orderNumber,
      };
    }

    // Persist incoming webhook event to immutable audit log with race-condition idempotency guard
    try {
      await this.prisma.paymentWebhookLog.create({
        data: {
          eventId: verified.eventId,
          provider: provider === 'MOCK' ? 'MANUAL' : provider,
          eventType: verified.eventType,
          status: 'PROCESSING',
          payload: verified.rawPayload as any,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        this.logger.warn(
          `[PaymentWebhook] Concurrent race duplicate intercepted for eventId ${verified.eventId}. Safely acknowledged.`,
        );
        return {
          received: true,
          duplicate: true,
          status: 'SUCCESS',
          orderNumber: verified.orderNumber,
        };
      }
      throw err;
    }

    // Execute state transition atomically
    const result = await this.prisma.$transaction(async (tx) => {
      // Find matching payment transaction
      let transaction: any = await tx.paymentTransaction.findUnique({
        where: { transactionReference: verified.transactionReference },
        include: { order: { include: { stockReservations: true } } },
      });

      if (!transaction && verified.orderNumber) {
        const order = await tx.order.findUnique({
          where: { orderNumber: verified.orderNumber },
          include: { paymentTransactions: true, stockReservations: true },
        });

        if (order && order.paymentTransactions.length > 0) {
          transaction = {
            ...order.paymentTransactions[0],
            order,
          };
        }
      }

      if (!transaction) {
        this.logger.error(
          `[PaymentWebhook] No matching transaction found for ref ${verified.transactionReference}`,
        );
        await tx.paymentWebhookLog.update({
          where: { eventId: verified.eventId },
          data: { status: 'UNMATCHED_TRANSACTION' },
        });
        return {
          received: true,
          status: 'UNMATCHED_TRANSACTION',
          orderNumber: verified.orderNumber,
        };
      }

      const order = transaction.order;

      if (verified.status === 'SUCCESS') {
        // Prevent double deductions if already marked paid
        if (order.paymentStatus !== 'PAID') {
          // Update Order and PaymentTransaction
          await tx.order.update({
            where: { id: order.id },
            data: {
              orderStatus: 'PAID',
              paymentStatus: 'PAID',
            },
          });

          await tx.paymentTransaction.update({
            where: { id: transaction.id },
            data: { status: 'SUCCESS' },
          });

          // Commit all stock reservations for this order
          const activeReservations = (order.stockReservations as any[]).filter(
            (r: any) => r.status === 'ACTIVE',
          );
          for (const res of activeReservations) {
            await this.inventoryService.commitStockReservation(
              res.id,
              order.id,
              'PAYMENT_WEBHOOK_COMMITTED',
            );
          }
        }
      } else if (verified.status === 'FAILED' || verified.status === 'CANCELLED') {
        await tx.order.update({
          where: { id: order.id },
          data: {
            orderStatus: 'CANCELLED',
            paymentStatus: 'FAILED',
          },
        });

        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: 'FAILED' },
        });

        // Release stock reservations back to available pool
        const activeReservations = (order.stockReservations as any[]).filter(
          (r: any) => r.status === 'ACTIVE',
        );
        for (const res of activeReservations) {
          await this.inventoryService.releaseStockReservation(
            res.id,
            'PAYMENT_WEBHOOK_FAILED',
            'PAYMENT_TRANSACTION_FAILED',
          );
        }
      } else if (verified.status === 'REFUNDED') {
        await tx.order.update({
          where: { id: order.id },
          data: {
            orderStatus: 'REFUNDED',
            paymentStatus: 'REFUNDED',
          },
        });

        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: 'REFUNDED' },
        });
      }

      await tx.paymentWebhookLog.update({
        where: { eventId: verified.eventId },
        data: { status: 'PROCESSED' },
      });

      return {
        received: true,
        status: verified.status,
        orderNumber: order.orderNumber,
        orderId: order.id,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
      };
    });

    // Trigger transactional notification asynchronously
    if (this.notificationsService && result.orderId) {
      if (verified.status === 'SUCCESS') {
        this.notificationsService
          .notifyOrderConfirmed(result.orderId, verified.eventId)
          .catch((err) =>
            this.logger.warn(`Could not dispatch order confirmation email: ${err.message}`),
          );
      } else if (verified.status === 'FAILED') {
        this.notificationsService
          .notifyPaymentStatus(
            result.orderId,
            'FAILED',
            result.totalAmount || 0,
            result.currency || 'NZD',
            undefined,
            verified.eventId,
          )
          .catch((err) =>
            this.logger.warn(`Could not dispatch payment failed email: ${err.message}`),
          );
      }
    }

    return {
      received: result.received,
      status: result.status,
      orderNumber: result.orderNumber,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Confirm Mock Payment (Testing / Local Development fast-path)
  // ---------------------------------------------------------------------------

  async confirmMockPayment(
    transactionReference: string,
    simulateSuccess = true,
  ): Promise<{ success: boolean; status: string; orderNumber: string }> {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (isProduction) {
      throw new ForbiddenException(
        'Mock payment simulation is disabled in production environments. Use genuine payment provider webhooks.',
      );
    }

    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { transactionReference },
      include: { order: { include: { stockReservations: true } } },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionReference} not found`);
    }

    const fakeEventId = `mock_evt_${transactionReference}_${Date.now()}`;
    const payload = {
      id: fakeEventId,
      type: simulateSuccess ? 'payment_intent.succeeded' : 'payment_intent.payment_failed',
      data: {
        object: {
          id: transactionReference,
          status: simulateSuccess ? 'succeeded' : 'failed',
          amount: Math.round(Number(transaction.amount) * 100),
          currency: transaction.currency.toLowerCase(),
          metadata: {
            orderId: transaction.orderId,
            orderNumber: transaction.order.orderNumber,
          },
        },
      },
    };

    const webhookResult = await this.handleWebhook('MOCK', payload, {});
    return {
      success: webhookResult.status === 'SUCCESS',
      status: webhookResult.status,
      orderNumber: transaction.order.orderNumber,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Process Refund
  // ---------------------------------------------------------------------------

  async processRefund(
    orderId: string,
    amount?: number,
    reason = 'Staff initiated refund',
  ): Promise<{ success: boolean; refundAmount: number; transactionReference: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        paymentTransactions: {
          where: { status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIALLY_REFUNDED') {
      throw new BadRequestException(
        `Cannot issue refund for order ${order.orderNumber} in payment status ${order.paymentStatus}`,
      );
    }

    const successfulTx = order.paymentTransactions[0];
    if (!successfulTx) {
      throw new BadRequestException(
        `No successful payment transaction found for order ${order.orderNumber}`,
      );
    }

    const refundAmount = amount ?? Number(order.totalAmount);
    const adapter = this.resolveAdapter(successfulTx.provider as PaymentGatewayProvider);

    let refundRef = `re_${Date.now()}`;
    if (adapter.processRefund) {
      const res = await adapter.processRefund({
        transactionReference: successfulTx.transactionReference,
        amount: refundAmount,
        reason,
      });
      refundRef = res.refundTransactionReference;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: successfulTx.provider,
          transactionReference: refundRef,
          idempotencyKey: `ref_${order.id}_${Date.now()}`,
          amount: refundAmount,
          currency: order.currency,
          status: 'REFUNDED',
          rawResponse: { reason, originalTransaction: successfulTx.transactionReference },
        },
      });

      const isFullRefund = refundAmount >= Number(order.totalAmount);

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          orderStatus: isFullRefund ? 'REFUNDED' : order.orderStatus,
        },
      });
    });

    return {
      success: true,
      refundAmount,
      transactionReference: refundRef,
    };
  }
}
