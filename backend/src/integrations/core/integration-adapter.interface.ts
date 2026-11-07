import { IntegrationCapability } from '@pinnacle/contracts';

export interface WebhookVerificationResult {
  isValid: boolean;
  timestamp?: number;
  failureReason?: string;
  isReplay?: boolean;
}

export interface InternalIntegrationCommand {
  eventType: string;
  externalId: string;
  entityType: 'PRODUCT' | 'LISTING' | 'CUSTOMER' | 'ORDER';
  correlationId: string;
  payload: Record<string, unknown>;
  syncHash: string;
}

export interface SyncJobExecutionInput {
  jobId: string;
  jobType: string;
  direction: 'INBOUND' | 'OUTBOUND';
  payload?: Record<string, unknown> | null;
  correlationId: string;
  credentials?: Record<string, string>;
  settings?: Record<string, unknown> | null;
}

export interface SyncJobExecutionResult {
  success: boolean;
  isTransient?: boolean;
  error?: string;
  externalId?: string;
  syncHash?: string;
  data?: Record<string, unknown>;
}

export interface IntegrationProviderAdapter {
  readonly providerKey: string;
  readonly displayName: string;
  readonly isMock: boolean;
  readonly capabilities: IntegrationCapability[];

  validateCredentials(credentials: Record<string, string>): Promise<boolean>;

  verifyWebhookSignature(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string,
  ): Promise<WebhookVerificationResult>;

  transformInboundWebhook(
    rawPayload: any,
    headers: Record<string, string | string[] | undefined>,
    correlationId: string,
  ): InternalIntegrationCommand;

  executeSync(input: SyncJobExecutionInput): Promise<SyncJobExecutionResult>;
}

