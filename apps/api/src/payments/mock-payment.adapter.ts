import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CreatePaymentIntentParams,
  PaymentGatewayAdapter,
  PaymentIntentResult,
  VerifyWebhookResult,
} from './payment-gateway.interface';
import { PaymentGatewayProvider } from '@pinnacle/contracts';

@Injectable()
export class MockPaymentGatewayAdapter implements PaymentGatewayAdapter {
  readonly providerName: PaymentGatewayProvider = 'MOCK';
  private readonly logger = new Logger(MockPaymentGatewayAdapter.name);

  // In-memory registry of mock intents for development and testing
  private readonly mockIntents = new Map<
    string,
    {
      orderId: string;
      orderNumber: string;
      amount: number;
      currency: string;
      status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
    }
  >();

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const transactionReference = `mock_pi_${params.orderNumber}_${Date.now().toString(36)}`;
    const clientSecret = `mock_sec_${randomUUID().replace(/-/g, '')}`;

    this.mockIntents.set(transactionReference, {
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      amount: params.amount,
      currency: params.currency,
      status: 'PENDING',
    });

    this.logger.log(
      `[MockPayment] Created intent ${transactionReference} for Order ${params.orderNumber} ($${params.amount} ${params.currency})`,
    );

    return {
      provider: 'MOCK',
      transactionReference,
      clientSecret,
      amount: params.amount,
      currency: params.currency,
      status: 'PENDING',
      rawResponse: {
        id: transactionReference,
        client_secret: clientSecret,
        amount: Math.round(params.amount * 100),
        currency: params.currency.toLowerCase(),
        status: 'requires_payment_method',
      },
    };
  }

  async verifyWebhook(
    payload: string | Buffer | Record<string, unknown>,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<VerifyWebhookResult> {
    const parsed = typeof payload === 'string' ? JSON.parse(payload) : (payload as any);
    const eventId = parsed.id || `mock_evt_${randomUUID()}`;
    const eventType = parsed.type || 'payment_intent.succeeded';
    const intentData = parsed.data?.object || parsed;

    const transactionReference =
      intentData.id || intentData.transactionReference || 'mock_unknown_tx';
    const isSuccess = eventType === 'payment_intent.succeeded' || intentData.status === 'succeeded';

    return {
      isValid: true,
      eventId,
      eventType,
      transactionReference,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      amount: intentData.amount ? intentData.amount / 100 : undefined,
      currency: intentData.currency ? intentData.currency.toUpperCase() : 'AUD',
      orderNumber: intentData.metadata?.orderNumber,
      metadata: intentData.metadata || {},
      rawPayload: parsed,
    };
  }

  async confirmPayment(transactionReference: string): Promise<PaymentIntentResult> {
    const intent = this.mockIntents.get(transactionReference);
    const amount = intent?.amount ?? 0;
    const currency = intent?.currency ?? 'AUD';

    if (intent) {
      intent.status = 'SUCCESS';
    }

    this.logger.log(`[MockPayment] Confirmed payment for transaction ${transactionReference}`);

    return {
      provider: 'MOCK',
      transactionReference,
      amount,
      currency,
      status: 'SUCCESS',
      rawResponse: {
        id: transactionReference,
        status: 'succeeded',
        amount_received: Math.round(amount * 100),
      },
    };
  }
}
