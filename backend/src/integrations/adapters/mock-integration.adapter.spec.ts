import { MockIntegrationAdapter } from './mock-integration.adapter';

describe('MockIntegrationAdapter', () => {
  let adapter: MockIntegrationAdapter;
  const secret = 'test-mock-webhook-secret-key-123';

  beforeEach(() => {
    adapter = new MockIntegrationAdapter();
  });

  it('is unmistakably labelled as a mock harness', () => {
    expect(adapter.isMock).toBe(true);
    expect(adapter.displayName).toContain('[TEST HARNESS - DO NOT USE IN PRODUCTION]');
  });

  it('validates authentic signed webhook with HMAC-SHA256', async () => {
    const payload = {
      event: 'MOCK_ORDER_SYNC',
      externalId: 'EXT-998822',
      data: { sku: 'TYRE-MIC-01', quantity: 4 },
    };

    const signed = adapter.generateSignedMockWebhook(payload, secret);

    const result = await adapter.verifyWebhookSignature(signed.payload, signed.headers, secret);

    expect(result.isValid).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  it('rejects forged or corrupted webhook signatures', async () => {
    const payload = { event: 'MOCK_ORDER_SYNC' };
    const signed = adapter.generateSignedMockWebhook(payload, secret);

    // Tamper with the signature header
    const tamperedHeaders = {
      ...signed.headers,
      'x-mock-signature': '0000000000000000000000000000000000000000000000000000000000000000',
    };

    const result = await adapter.verifyWebhookSignature(signed.payload, tamperedHeaders, secret);

    expect(result.isValid).toBe(false);
    expect(result.failureReason).toContain('signature mismatch');
  });

  it('rejects replay attack with timestamp older than 300 seconds', async () => {
    const payload = { event: 'MOCK_ORDER_SYNC' };
    // Generate signature with timestamp 305 seconds in the past
    const staleWebhook = adapter.generateSignedMockWebhook(payload, secret, -305);

    const result = await adapter.verifyWebhookSignature(staleWebhook.payload, staleWebhook.headers, secret);

    expect(result.isValid).toBe(false);
    expect(result.isReplay).toBe(true);
    expect(result.failureReason).toContain('Replay attack rejected');
  });

  it('transforms external vendor schema into canonical internal command DTO with syncHash', () => {
    const rawExternalPayload = {
      eventType: 'marketplace.order.created',
      externalId: 'EXT-ORD-4488',
      data: {
        total: 890.0,
        currency: 'AUD',
      },
    };

    const command = adapter.transformInboundWebhook(rawExternalPayload, {}, 'test-corr-123');

    expect(command.eventType).toBe('marketplace.order.created');
    expect(command.externalId).toBe('EXT-ORD-4488');
    expect(command.entityType).toBe('ORDER');
    expect(command.correlationId).toBe('test-corr-123');
    expect(command.syncHash).toBeDefined();
    expect(command.syncHash.length).toBe(64); // SHA-256
  });

  it('executes sync and handles simulated transient rate limit vs permanent failure', async () => {
    // Normal execution
    const successResult = await adapter.executeSync({
      jobId: 'job-1',
      jobType: 'CATALOG_PUBLISH',
      direction: 'OUTBOUND',
      correlationId: 'corr-1',
    });
    expect(successResult.success).toBe(true);

    // Transient failure simulation
    adapter.setSimulateTransientError(true);
    const transientResult = await adapter.executeSync({
      jobId: 'job-2',
      jobType: 'CATALOG_PUBLISH',
      direction: 'OUTBOUND',
      correlationId: 'corr-2',
    });
    expect(transientResult.success).toBe(false);
    expect(transientResult.isTransient).toBe(true);

    // Permanent failure simulation
    adapter.setSimulateTransientError(false);
    adapter.setSimulatePermanentError(true);
    const permResult = await adapter.executeSync({
      jobId: 'job-3',
      jobType: 'CATALOG_PUBLISH',
      direction: 'OUTBOUND',
      correlationId: 'corr-3',
    });
    expect(permResult.success).toBe(false);
    expect(permResult.isTransient).toBe(false);
  });
});

