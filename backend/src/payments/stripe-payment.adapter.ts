import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  CreatePaymentIntentParams,
  PaymentGatewayAdapter,
  PaymentIntentResult,
  VerifyWebhookResult,
} from './payment-gateway.interface';
import { PaymentGatewayProvider } from '@pinnacle/contracts';

@Injectable()
export class StripePaymentGatewayAdapter implements PaymentGatewayAdapter {
  readonly providerName: PaymentGatewayProvider = 'STRIPE';
  private readonly logger = new Logger(StripePaymentGatewayAdapter.name);

  private readonly secretKey: string | null;
  private readonly webhookSecret: string | null;

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>('STRIPE_SECRET_KEY') || null;
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') || null;

    if (!this.secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not set. Operating in offline/simulated Stripe adapter mode.',
      );
    }
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const amountInCents = Math.round(params.amount * 100);

    if (!this.secretKey) {
      // In offline/test mode without credentials, simulate a Stripe payment intent
      const simulatedPi = `pi_test_${params.orderNumber}_${Date.now().toString(36)}`;
      const simulatedSecret = `${simulatedPi}_secret_${crypto.randomBytes(16).toString('hex')}`;

      this.logger.log(
        `[Stripe-Simulated] Created intent ${simulatedPi} for Order ${params.orderNumber} ($${params.amount} ${params.currency})`,
      );

      return {
        provider: 'STRIPE',
        transactionReference: simulatedPi,
        clientSecret: simulatedSecret,
        amount: params.amount,
        currency: params.currency,
        status: 'PENDING',
        rawResponse: {
          id: simulatedPi,
          client_secret: simulatedSecret,
          amount: amountInCents,
          currency: params.currency.toLowerCase(),
          status: 'requires_payment_method',
        },
      };
    }

    try {
      const body = new URLSearchParams({
        amount: amountInCents.toString(),
        currency: params.currency.toLowerCase(),
        'metadata[orderId]': params.orderId,
        'metadata[orderNumber]': params.orderNumber,
        receipt_email: params.customerEmail,
        'automatic_payment_methods[enabled]': 'true',
      });

      const res = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': params.idempotencyKey,
        },
        body: body.toString(),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        this.logger.error(`Stripe payment intent creation failed: ${JSON.stringify(data)}`);
        throw new Error(data.error?.message || 'Stripe payment intent creation failed');
      }

      return {
        provider: 'STRIPE',
        transactionReference: data.id,
        clientSecret: data.client_secret,
        amount: params.amount,
        currency: params.currency,
        status: 'PENDING',
        rawResponse: data,
      };
    } catch (err: any) {
      this.logger.error(`Error calling Stripe API: ${err.message}`);
      throw err;
    }
  }

  async verifyWebhook(
    payload: string | Buffer | Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<VerifyWebhookResult> {
    const rawBody =
      typeof payload === 'string'
        ? payload
        : Buffer.isBuffer(payload)
          ? payload.toString('utf8')
          : JSON.stringify(payload);

    const sigHeader = (headers['stripe-signature'] || headers['Stripe-Signature']) as
      string | undefined;

    if (this.webhookSecret && sigHeader) {
      // Cryptographic verification according to Stripe signature specification:
      // Header format: t=timestamp,v1=signature
      const signatureElements = sigHeader.split(',').reduce<Record<string, string>>((acc, el) => {
        const [k, v] = el.split('=');
        if (k && v) acc[k.trim()] = v.trim();
        return acc;
      }, {});

      const timestamp = signatureElements['t'];
      const signature = signatureElements['v1'];

      if (!timestamp || !signature) {
        throw new UnauthorizedException('Invalid stripe-signature header structure');
      }

      const signedPayload = `${timestamp}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      const sigBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (
        sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        throw new UnauthorizedException('Stripe webhook signature verification failed');
      }
    } else if (this.webhookSecret && !sigHeader) {
      throw new UnauthorizedException('Missing stripe-signature header');
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id;
    const eventType = event.type;
    const obj = event.data?.object || {};

    let status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED' = 'FAILED';
    if (eventType === 'payment_intent.succeeded' || eventType === 'checkout.session.completed') {
      status = 'SUCCESS';
    } else if (eventType === 'payment_intent.payment_failed') {
      status = 'FAILED';
    } else if (eventType === 'payment_intent.canceled') {
      status = 'CANCELLED';
    } else if (eventType === 'charge.refunded') {
      status = 'REFUNDED';
    }

    return {
      isValid: true,
      eventId,
      eventType,
      transactionReference: obj.id || 'unknown_tx',
      status,
      amount: obj.amount ? obj.amount / 100 : undefined,
      currency: obj.currency ? obj.currency.toUpperCase() : 'NZD',
      orderNumber: obj.metadata?.orderNumber,
      metadata: obj.metadata || {},
      rawPayload: event,
    };
  }

  async processRefund(params: {
    transactionReference: string;
    amount: number;
    reason?: string;
  }): Promise<{ success: boolean; refundTransactionReference: string }> {
    const amountInCents = Math.round(params.amount * 100);

    if (!this.secretKey) {
      const simulatedRefund = `re_test_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
      this.logger.log(
        `[Stripe-Simulated] Processed refund ${simulatedRefund} for ${params.transactionReference} ($${params.amount})`,
      );
      return {
        success: true,
        refundTransactionReference: simulatedRefund,
      };
    }

    try {
      const body = new URLSearchParams({
        payment_intent: params.transactionReference,
        amount: amountInCents.toString(),
      });
      if (params.reason) {
        body.append('reason', 'requested_by_customer');
      }

      const res = await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        this.logger.error(`Stripe refund failed: ${JSON.stringify(data)}`);
        throw new Error(data.error?.message || 'Stripe refund failed');
      }

      return {
        success: true,
        refundTransactionReference: data.id,
      };
    } catch (err: any) {
      this.logger.error(`Error processing Stripe refund: ${err.message}`);
      throw err;
    }
  }
}
