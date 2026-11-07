import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SendEmailOptions,
  TransactionalEmailAdapter,
} from './adapters/email-provider.interface';
import { MockEmailAdapter } from './adapters/mock-email.adapter';
import { SmtpEmailAdapter } from './adapters/smtp-email.adapter';
import {
  renderAccountMessage,
  renderDispatchUpdate,
  renderOrderCancelled,
  renderOrderConfirmation,
  renderPaymentStatusUpdate,
  renderReturnUpdate,
} from './templates/email-templates';
import { ConfigService } from '@nestjs/config';
import {
  NotificationPageDto,
  NotificationQueryDto,
  NotificationRecordDto,
  NotificationStatusContract,
  NotificationTypeContract,
} from '@pinnacle/contracts';
import { DocumentsService } from '../documents/documents.service';

export interface DispatchNotificationInput {
  channel?: 'EMAIL' | 'SMS' | 'IN_APP';
  type: NotificationTypeContract;
  recipient: string;
  subject: string;
  templateName: string;
  html: string;
  text: string;
  payload?: Record<string, unknown>;
  orderId?: string;
  customerId?: string;
  idempotencyKey?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType: string;
  }>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly emailAdapter: TransactionalEmailAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mockAdapter: MockEmailAdapter,
    private readonly smtpAdapter: SmtpEmailAdapter,
    private readonly documentsService: DocumentsService,
  ) {
    const provider = this.config.get<string>('TRANSACTIONAL_EMAIL_PROVIDER') || 'MOCK';
    if (provider.toUpperCase() === 'SMTP') {
      this.emailAdapter = this.smtpAdapter;
    } else {
      this.emailAdapter = this.mockAdapter;
    }
    this.logger.log(`Initialized NotificationsService with "${this.emailAdapter.providerName}" email adapter`);
  }

  // ---------------------------------------------------------------------------
  // Core Dispatch Engine with Idempotency & Retry Tracking
  // ---------------------------------------------------------------------------

  async dispatchNotification(input: DispatchNotificationInput): Promise<NotificationRecordDto> {
    const maskedRecipient = this.maskEmail(input.recipient);

    // 1. Idempotency Check: prevent duplicate business messages
    if (input.idempotencyKey) {
      const existing = await this.prisma.notificationRecord.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (existing) {
        if (existing.status === 'SENT') {
          this.logger.log(
            `[Idempotency] Notification for key "${input.idempotencyKey}" already SENT to "${maskedRecipient}". Skipping re-dispatch.`,
          );
          return this.toDto(existing);
        }
        if (existing.status === 'PENDING') {
          this.logger.log(
            `[Idempotency] Notification for key "${input.idempotencyKey}" is currently PENDING. Returning existing record.`,
          );
          return this.toDto(existing);
        }
      }
    }

    // 2. Persist notification record in database
    const record = await this.prisma.notificationRecord.upsert({
      where: {
        idempotencyKey: input.idempotencyKey || `auto-${Date.now()}-${Math.random()}`,
      },
      create: {
        channel: input.channel || 'EMAIL',
        type: input.type as any,
        recipient: input.recipient,
        subject: input.subject,
        templateName: input.templateName,
        status: 'PENDING',
        payload: (input.payload as any) ?? null,
        orderId: input.orderId,
        customerId: input.customerId,
        idempotencyKey: input.idempotencyKey,
      },
      update: {
        subject: input.subject,
        payload: (input.payload as any) ?? null,
      },
    });

    // 3. Deliver via Transactional Email Adapter
    const emailOptions: SendEmailOptions = {
      to: input.recipient,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
      idempotencyKey: input.idempotencyKey,
      metadata: {
        notificationId: record.id,
        type: input.type,
        orderId: input.orderId || '',
      },
    };

    const result = await this.emailAdapter.sendEmail(emailOptions);

    // 4. Update status based on result
    if (result.success) {
      const updated = await this.prisma.notificationRecord.update({
        where: { id: record.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: result.messageId,
          errorMessage: null,
        },
      });
      return this.toDto(updated);
    }

    // 5. Failure Handling: Transient vs Permanent
    const newRetryCount = record.retryCount + 1;
    const isPermanent = !result.isTransient || newRetryCount >= record.maxRetries;

    const nextRetryAt = isPermanent
      ? null
      : new Date(Date.now() + Math.pow(2, newRetryCount) * 5 * 60 * 1000); // 10m, 20m, 40m

    const failed = await this.prisma.notificationRecord.update({
      where: { id: record.id },
      data: {
        status: isPermanent ? 'PERMANENTLY_FAILED' : 'FAILED',
        retryCount: newRetryCount,
        nextRetryAt,
        errorMessage: result.error || 'Unknown dispatch failure',
      },
    });

    return this.toDto(failed);
  }

  // ---------------------------------------------------------------------------
  // High-Level Domain Triggers
  // ---------------------------------------------------------------------------

  async notifyOrderConfirmed(orderId: string, idempotencyKey?: string): Promise<NotificationRecordDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Ensure invoice is generated from immutable snapshot
    const invoiceDoc = await this.documentsService.generateTaxInvoiceForOrder(
      order.id,
      order.customerId ?? undefined,
    );
    const invoiceFile = await this.documentsService.getDocumentFile(invoiceDoc.id, {
      sub: 'system',
      email: 'system@pinnacle.internal',
      isStaff: true,
      permissions: ['orders:view:all'],
    });

    const shipping = order.shippingAddress as any;
    const customerName = `${shipping.firstName || 'Valued'} ${shipping.lastName || 'Customer'}`.trim();

    const rendered = renderOrderConfirmation({
      orderNumber: order.orderNumber,
      customerName,
      items: order.items.map((i) => ({
        title: i.titleSnapshot,
        sku: i.skuSnapshot,
        saleUnit: i.saleUnitNameSnapshot,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      shippingFee: Number(order.shippingFee),
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      shippingMethod: shipping.deliveryOption || 'Standard Delivery',
      shippingAddressText: `${shipping.line1 || ''}, ${shipping.city || ''} ${shipping.state || ''} ${shipping.postalCode || ''}`.trim(),
    });

    return this.dispatchNotification({
      type: 'ORDER_CONFIRMATION',
      recipient: order.customerEmail,
      subject: rendered.subject,
      templateName: 'order_confirmation',
      html: rendered.html,
      text: rendered.text,
      orderId: order.id,
      customerId: order.customerId ?? undefined,
      idempotencyKey: idempotencyKey || `order-confirm-${order.id}`,
      payload: {
        orderNumber: order.orderNumber,
        total: Number(order.totalAmount),
      },
      attachments: [
        {
          filename: invoiceDoc.fileName,
          content: invoiceFile.buffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  async notifyPaymentStatus(
    orderId: string,
    status: 'PAID' | 'FAILED' | 'REFUNDED',
    amount: number,
    currency: string,
    reason?: string,
    idempotencyKey?: string,
  ): Promise<NotificationRecordDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const shipping = order.shippingAddress as any;
    const customerName = `${shipping.firstName || 'Valued'} ${shipping.lastName || 'Customer'}`.trim();

    const rendered = renderPaymentStatusUpdate({
      orderNumber: order.orderNumber,
      customerName,
      status,
      amount,
      currency,
      reason,
    });

    return this.dispatchNotification({
      type: 'PAYMENT_STATUS_UPDATE',
      recipient: order.customerEmail,
      subject: rendered.subject,
      templateName: 'payment_status',
      html: rendered.html,
      text: rendered.text,
      orderId: order.id,
      customerId: order.customerId ?? undefined,
      idempotencyKey: idempotencyKey || `pay-${status.toLowerCase()}-${order.id}`,
      payload: {
        orderNumber: order.orderNumber,
        status,
        amount,
      },
    });
  }

  async notifyDispatch(
    orderId: string,
    type: 'COURIER_DISPATCH' | 'DEPOT_READY',
    carrierName?: string,
    trackingNumber?: string,
    trackingUrl?: string,
    idempotencyKey?: string,
  ): Promise<NotificationRecordDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const shipping = order.shippingAddress as any;
    const customerName = `${shipping.firstName || 'Valued'} ${shipping.lastName || 'Customer'}`.trim();

    const rendered = renderDispatchUpdate({
      orderNumber: order.orderNumber,
      customerName,
      type,
      carrierName,
      trackingNumber,
      trackingUrl,
    });

    return this.dispatchNotification({
      type: type === 'COURIER_DISPATCH' ? 'ORDER_DISPATCHED' : 'ORDER_READY_FOR_COLLECTION',
      recipient: order.customerEmail,
      subject: rendered.subject,
      templateName: type === 'COURIER_DISPATCH' ? 'order_dispatched' : 'order_ready_collection',
      html: rendered.html,
      text: rendered.text,
      orderId: order.id,
      customerId: order.customerId ?? undefined,
      idempotencyKey: idempotencyKey || `dispatch-${type.toLowerCase()}-${order.id}`,
      payload: {
        orderNumber: order.orderNumber,
        carrierName,
        trackingNumber,
      },
    });
  }

  async notifyCancellation(
    orderId: string,
    reason: string,
    refundAmount?: number,
    idempotencyKey?: string,
  ): Promise<NotificationRecordDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const shipping = order.shippingAddress as any;
    const customerName = `${shipping.firstName || 'Valued'} ${shipping.lastName || 'Customer'}`.trim();

    const rendered = renderOrderCancelled({
      orderNumber: order.orderNumber,
      customerName,
      reason,
      refundAmount,
      currency: order.currency,
    });

    return this.dispatchNotification({
      type: 'ORDER_CANCELLED',
      recipient: order.customerEmail,
      subject: rendered.subject,
      templateName: 'order_cancelled',
      html: rendered.html,
      text: rendered.text,
      orderId: order.id,
      customerId: order.customerId ?? undefined,
      idempotencyKey: idempotencyKey || `order-cancelled-${order.id}`,
      payload: {
        orderNumber: order.orderNumber,
        reason,
        refundAmount,
      },
    });
  }

  async notifyReturnStatus(
    returnRequestId: string,
    idempotencyKey?: string,
  ): Promise<NotificationRecordDto> {
    const ret = await this.prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        order: true,
      },
    });

    if (!ret) {
      throw new NotFoundException(`Return request ${returnRequestId} not found`);
    }

    const shipping = ret.order.shippingAddress as any;
    const customerName = `${shipping.firstName || 'Valued'} ${shipping.lastName || 'Customer'}`.trim();

    const rendered = renderReturnUpdate({
      returnNumber: ret.rmaNumber,
      orderNumber: ret.order.orderNumber,
      customerName,
      returnStatus: ret.status,
      decisionNote: ret.customerNotes || undefined,
      currency: ret.order.currency,
    });

    return this.dispatchNotification({
      type: 'RETURN_UPDATE',
      recipient: ret.order.customerEmail,
      subject: rendered.subject,
      templateName: 'return_status_update',
      html: rendered.html,
      text: rendered.text,
      orderId: ret.order.id,
      customerId: ret.order.customerId ?? undefined,
      idempotencyKey: idempotencyKey || `return-update-${ret.id}-${ret.status}`,
      payload: {
        returnNumber: ret.rmaNumber,
        status: ret.status,
      },
    });
  }

  async notifyAccountWelcome(
    email: string,
    name: string,
    actionUrl: string,
  ): Promise<NotificationRecordDto> {
    const rendered = renderAccountMessage({
      customerName: name,
      type: 'WELCOME',
      actionUrl,
    });

    return this.dispatchNotification({
      type: 'ACCOUNT_WELCOME',
      recipient: email,
      subject: rendered.subject,
      templateName: 'account_welcome',
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: `welcome-${email.toLowerCase()}`,
    });
  }

  async notifyPasswordReset(
    email: string,
    name: string,
    actionUrl: string,
    expiresInMinutes = 30,
  ): Promise<NotificationRecordDto> {
    const rendered = renderAccountMessage({
      customerName: name,
      type: 'PASSWORD_RESET',
      actionUrl,
      expiresInMinutes,
    });

    return this.dispatchNotification({
      type: 'PASSWORD_RESET',
      recipient: email,
      subject: rendered.subject,
      templateName: 'password_reset',
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: `pw-reset-${email.toLowerCase()}-${Date.now()}`,
    });
  }

  // ---------------------------------------------------------------------------
  // Staff Operational Queries & Manual Retry
  // ---------------------------------------------------------------------------

  async retryNotification(notificationId: string): Promise<NotificationRecordDto> {
    const record = await this.prisma.notificationRecord.findUnique({
      where: { id: notificationId },
    });

    if (!record) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    if (record.status === 'SENT') {
      throw new BadRequestException('Notification has already been successfully delivered.');
    }

    this.logger.log(`[Retry] Retrying delivery for notification ${notificationId} to ${this.maskEmail(record.recipient)}`);

    const result = await this.emailAdapter.sendEmail({
      to: record.recipient,
      subject: record.subject,
      html: `<p>Operational notification re-dispatched for ${record.type}</p>`,
      text: `Operational notification re-dispatched for ${record.type}`,
      idempotencyKey: `retry-${record.id}-${Date.now()}`,
    });

    if (result.success) {
      const updated = await this.prisma.notificationRecord.update({
        where: { id: record.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: result.messageId,
          errorMessage: null,
          retryCount: { increment: 1 },
        },
      });
      return this.toDto(updated);
    }

    const failed = await this.prisma.notificationRecord.update({
      where: { id: record.id },
      data: {
        status: record.retryCount + 1 >= record.maxRetries ? 'PERMANENTLY_FAILED' : 'FAILED',
        retryCount: { increment: 1 },
        errorMessage: result.error || 'Retry attempt failed',
      },
    });

    return this.toDto(failed);
  }

  async getNotifications(query: NotificationQueryDto): Promise<NotificationPageDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.orderId) {
      where.orderId = query.orderId;
    }

    const [total, records] = await Promise.all([
      this.prisma.notificationRecord.count({ where }),
      this.prisma.notificationRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: records.map(this.toDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getNotificationById(id: string): Promise<NotificationRecordDto> {
    const record = await this.prisma.notificationRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return this.toDto(record);
  }

  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.***';
    const u = parts[0] ?? '';
    const visibleChar = u.length > 0 ? u[0] : '*';
    return `${visibleChar}***@${parts[1]}`;
  }

  private toDto(record: {
    id: string;
    channel: string;
    type: string;
    recipient: string;
    subject: string;
    templateName: string;
    status: string;
    errorMessage: string | null;
    retryCount: number;
    maxRetries: number;
    nextRetryAt: Date | null;
    sentAt: Date | null;
    orderId: string | null;
    customerId: string | null;
    createdAt: Date;
  }): NotificationRecordDto {
    return {
      id: record.id,
      channel: record.channel as any,
      type: record.type as NotificationTypeContract,
      recipient: record.recipient,
      subject: record.subject,
      templateName: record.templateName,
      status: record.status as NotificationStatusContract,
      errorMessage: record.errorMessage,
      retryCount: record.retryCount,
      maxRetries: record.maxRetries,
      nextRetryAt: record.nextRetryAt ? record.nextRetryAt.toISOString() : null,
      sentAt: record.sentAt ? record.sentAt.toISOString() : null,
      orderId: record.orderId,
      customerId: record.customerId,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

