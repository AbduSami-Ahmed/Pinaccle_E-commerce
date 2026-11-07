import { PaymentGatewayProvider } from '@pinnacle/contracts';

export interface CreatePaymentIntentParams {
  orderId: string;
  orderNumber: string;
  amount: number; // in AUD dollars
  currency: string;
  customerEmail: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  provider: PaymentGatewayProvider;
  transactionReference: string;
  clientSecret?: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  rawResponse?: Record<string, unknown>;
}

export interface VerifyWebhookResult {
  isValid: boolean;
  eventId: string;
  eventType: string;
  transactionReference: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  amount?: number;
  currency?: string;
  orderNumber?: string;
  metadata?: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
}

export const PAYMENT_GATEWAY_ADAPTER = 'PAYMENT_GATEWAY_ADAPTER';

export interface PaymentGatewayAdapter {
  readonly providerName: PaymentGatewayProvider;

  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;

  verifyWebhook(
    payload: string | Buffer | Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<VerifyWebhookResult>;

  confirmPayment?(transactionReference: string): Promise<PaymentIntentResult>;

  processRefund?(params: {
    transactionReference: string;
    amount: number;
    reason?: string;
  }): Promise<{ success: boolean; refundTransactionReference: string }>;
}
