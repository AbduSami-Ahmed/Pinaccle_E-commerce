import { Injectable } from '@nestjs/common';
import { createHmac, createHash } from 'crypto';
import {
  InternalIntegrationCommand,
  IntegrationProviderAdapter,
  SyncJobExecutionInput,
  SyncJobExecutionResult,
  WebhookVerificationResult,
} from '../core/integration-adapter.interface';
import { IntegrationCapability } from '@pinnacle/contracts';

@Injectable()
export class MockIntegrationAdapter implements IntegrationProviderAdapter {
  readonly providerKey = 'MOCK_MARKETPLACE';
  readonly displayName = 'Mock Marketplace [TEST HARNESS - DO NOT USE IN PRODUCTION]';
  readonly isMock = true;

  readonly capabilities: IntegrationCapability[] = [
    'INVENTORY_SYNC_INBOUND',
    'INVENTORY_SYNC_OUTBOUND',
    'CATALOG_PUBLISH',
    'ORDERS_IMPORT',
    'ORDERS_STATUS_UPDATE',
    'WEBHOOK_INGESTION',
  ];

  private simulateTransientError = false;
  private simulatePermanentError = false;

  setSimulateTransientError(enable: boolean) {
    this.simulateTransientError = enable;
  }

  setSimulatePermanentError(enable: boolean) {
    this.simulatePermanentError = enable;
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    // Validates that required mock test credentials exist
    return Boolean(credentials['apiKey'] && credentials['apiSecret']);
  }

  async verifyWebhookSignature(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string,
  ): Promise<WebhookVerificationResult> {
    const rawSignature = headers['x-mock-signature'];
    const signature = Array.isArray(rawSignature) ? rawSignature[0] : rawSignature;

    const rawTimestamp = headers['x-mock-timestamp'];
    const timestampStr = Array.isArray(rawTimestamp) ? rawTimestamp[0] : rawTimestamp;

    if (!signature || !timestampStr) {
      return {
        isValid: false,
        failureReason: 'Missing x-mock-signature or x-mock-timestamp header',
      };
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      return {
        isValid: false,
        failureReason: 'Invalid timestamp format in header',
      };
    }

    // 1. Replay attack verification: reject events older than 300 seconds (5 minutes)
    const currentUnix = Math.floor(Date.now() / 1000);
    const ageSeconds = currentUnix - timestamp;
    if (ageSeconds > 300) {
      return {
        isValid: false,
        isReplay: true,
        failureReason: `Replay attack rejected: payload timestamp is ${ageSeconds}s old (max 300s)`,
      };
    }

    // 2. Cryptographic signature check: HMAC-SHA256(timestamp + "." + payload, secret)
    const rawBody = typeof payload === 'string' ? payload : payload.toString('utf8');
    const expectedSignature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      return {
        isValid: false,
        failureReason: 'Cryptographic HMAC signature mismatch',
      };
    }

    return {
      isValid: true,
      timestamp,
    };
  }

  transformInboundWebhook(
    rawPayload: any,
    _headers: Record<string, string | string[] | undefined>,
    correlationId: string,
  ): InternalIntegrationCommand {
    const eventType = rawPayload.eventType || rawPayload.event || 'UNKNOWN_MOCK_EVENT';
    const externalId = rawPayload.externalId || rawPayload.id || `mock-${Date.now()}`;
    const entityType = this.resolveEntityType(eventType);

    // Compute deterministic syncHash of normalized payload to prevent ping-pong update loops
    const syncHash = createHash('sha256')
      .update(JSON.stringify(rawPayload.data || rawPayload))
      .digest('hex');

    return {
      eventType,
      externalId,
      entityType,
      correlationId,
      payload: rawPayload.data || rawPayload,
      syncHash,
    };
  }

  async executeSync(input: SyncJobExecutionInput): Promise<SyncJobExecutionResult> {
    if (this.simulateTransientError) {
      return {
        success: false,
        isTransient: true,
        error: 'Simulated 429 Rate Limit Exceeded (Mock Transient Failure)',
      };
    }

    if (this.simulatePermanentError) {
      return {
        success: false,
        isTransient: false,
        error: 'Simulated 400 Bad Request: Invalid Marketplace Schema (Permanent Failure)',
      };
    }

    const syncHash = createHash('sha256')
      .update(JSON.stringify(input.payload || {}))
      .digest('hex');

    return {
      success: true,
      externalId: (input.payload?.['externalId'] as string) || `ext-${input.jobId}`,
      syncHash,
      data: {
        processedBy: this.displayName,
        jobType: input.jobType,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Helper to generate a valid signed mock webhook request for testing.
   */
  generateSignedMockWebhook(
    payload: Record<string, unknown>,
    secret: string,
    timestampOffsetSeconds = 0,
  ): { payload: string; headers: Record<string, string> } {
    const rawPayload = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000) + timestampOffsetSeconds;
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawPayload}`)
      .digest('hex');

    return {
      payload: rawPayload,
      headers: {
        'content-type': 'application/json',
        'x-mock-signature': signature,
        'x-mock-timestamp': timestamp.toString(),
      },
    };
  }

  private resolveEntityType(
    eventType: string,
  ): 'PRODUCT' | 'LISTING' | 'CUSTOMER' | 'ORDER' {
    const lower = eventType.toLowerCase();
    if (lower.includes('order')) return 'ORDER';
    if (lower.includes('customer')) return 'CUSTOMER';
    if (lower.includes('listing')) return 'LISTING';
    return 'PRODUCT';
  }
}

