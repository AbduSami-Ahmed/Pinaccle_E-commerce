import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  GmailMailboxAdapter,
  MANDATORY_BUSINESS_EMAIL_FILTER,
  PERMITTED_GMAIL_SCOPES,
  PROHIBITED_GMAIL_SCOPES,
} from './gmail-mailbox.adapter';

describe('GmailMailboxAdapter', () => {
  let adapter: GmailMailboxAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GmailMailboxAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GMAIL_CLIENT_ID') return 'google_workspace_client_id_12345';
              if (key === 'GMAIL_CLIENT_SECRET') return 'google_workspace_client_secret_67890';
              if (key === 'GMAIL_REFRESH_TOKEN') return '1//04_test_google_oauth_refresh_token_abcde';
              if (key === 'GMAIL_MAILBOX_EMAIL') return 'trade@pinnacleparts.co.nz';
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<GmailMailboxAdapter>(GmailMailboxAdapter);
  });

  describe('Capabilities & Definition', () => {
    it('declares correct providerKey and mailbox capabilities', () => {
      expect(adapter.providerKey).toBe('GMAIL');
      expect(adapter.displayName).toBe('Google Workspace / Gmail Business Mailbox');
      expect(adapter.isMock).toBe(false);
      expect(adapter.capabilities).toContain('ORDERS_IMPORT');
      expect(adapter.capabilities).toContain('ORDERS_STATUS_UPDATE');
      expect(adapter.capabilities).toContain('WEBHOOK_INGESTION');
      expect(adapter.capabilities).not.toContain('CATALOG_PUBLISH');
    });
  });

  describe('Credential Validation & Security Constraints', () => {
    it('validates present and complete OAuth 2.0 credentials in simulation mode', async () => {
      adapter.setSimulationMode(true);
      const valid = await adapter.validateCredentials({
        clientId: 'google_workspace_client_id_12345',
        clientSecret: 'google_workspace_client_secret_67890',
        refreshToken: '1//04_test_google_oauth_refresh_token_abcde',
        mailboxEmail: 'trade@pinnacleparts.co.nz',
        authorizedScopes: JSON.stringify([...PERMITTED_GMAIL_SCOPES]),
      });
      expect(valid).toBe(true);
    });

    it('strictly rejects any credential payload containing mailbox passwords', async () => {
      await expect(
        adapter.validateCredentials({
          clientId: 'client_id_123',
          clientSecret: 'client_secret_456',
          refreshToken: 'refresh_token_789',
          password: 'SecretMailboxPassword123!',
        } as any),
      ).rejects.toThrow('Direct mailbox passwords are strictly prohibited');
    });

    it('rejects overbroad OAuth scopes (e.g. mail.google.com full access)', async () => {
      adapter.setSimulationMode(true);
      const overbroad = await adapter.validateCredentials({
        clientId: 'client_id_12345678',
        clientSecret: 'client_secret_12345678',
        refreshToken: 'refresh_token_12345678',
        mailboxEmail: 'trade@pinnacleparts.co.nz',
        authorizedScopes: JSON.stringify([PROHIBITED_GMAIL_SCOPES[0]]),
      });
      expect(overbroad).toBe(false);
    });

    it('rejects incomplete, empty, or missing credentials', async () => {
      const totallyMissing = await adapter.validateCredentials(null as any);
      expect(totallyMissing).toBe(false);

      const emptyToken = await adapter.validateCredentials({
        clientId: 'client_id_12345678',
        clientSecret: 'client_secret_12345678',
        refreshToken: '',
      });
      expect(emptyToken).toBe(false);

      const invalidEmail = await adapter.validateCredentials({
        clientId: 'client_id_12345678',
        clientSecret: 'client_secret_12345678',
        refreshToken: 'refresh_token_12345678',
        mailboxEmail: 'not-an-email',
      });
      expect(invalidEmail).toBe(false);
    });
  });

  describe('Google Cloud Pub/Sub Webhook Verification & Replay Protection', () => {
    const secret = 'pubsub_verification_secret_9988';
    const currentUnix = Math.floor(Date.now() / 1000);
    const pubSubEnvelope = JSON.stringify({
      message: {
        data: Buffer.from(JSON.stringify({ historyId: '123456', emailAddress: 'trade@pinnacleparts.co.nz' })).toString('base64'),
        messageId: 'pubsub_msg_101',
        publishTime: new Date(currentUnix * 1000).toISOString(),
      },
      subscription: 'projects/pinnacle/subscriptions/trade-inbox',
    });

    it('verifies valid Pub/Sub push notification with matching bearer token', async () => {
      const result = await adapter.verifyWebhookSignature(
        pubSubEnvelope,
        { authorization: `Bearer ${secret}` },
        secret,
      );

      expect(result.isValid).toBe(true);
      expect(result.timestamp).toBe(currentUnix);
    });

    it('rejects missing or mismatched Pub/Sub secret token', async () => {
      const result = await adapter.verifyWebhookSignature(
        pubSubEnvelope,
        { authorization: 'Bearer wrong_token' },
        secret,
      );

      expect(result.isValid).toBe(false);
      expect(result.failureReason).toContain('Pub/Sub verification secret mismatch');
    });

    it('detects and rejects expired Pub/Sub notification replay outside 5-minute window', async () => {
      const staleUnix = currentUnix - 400; // 400 seconds ago
      const staleEnvelope = JSON.stringify({
        message: {
          data: 'eyJ0ZXN0IjoxfQ==',
          messageId: 'pubsub_stale_102',
          publishTime: new Date(staleUnix * 1000).toISOString(),
        },
      });

      const result = await adapter.verifyWebhookSignature(
        staleEnvelope,
        { authorization: `Bearer ${secret}` },
        secret,
      );

      expect(result.isValid).toBe(false);
      expect(result.isReplay).toBe(true);
      expect(result.failureReason).toContain('5-minute replay window');
    });
  });

  describe('Webhook Inbound Transformation', () => {
    it('decodes Pub/Sub base64 data into InternalIntegrationCommand', () => {
      const innerData = {
        emailAddress: 'trade@pinnacleparts.co.nz',
        historyId: '882194',
        message: {
          subject: 'Pinnacle Automotive - Collision Repair RFQ',
        },
      };

      const rawPayload = {
        message: {
          data: Buffer.from(JSON.stringify(innerData)).toString('base64'),
          messageId: 'pubsub_evt_9988',
        },
      };

      const cmd = adapter.transformInboundWebhook(rawPayload, {}, 'corr-pubsub-1');

      expect(cmd.eventType).toBe('GMAIL_PUSH_NOTIFICATION');
      expect(cmd.externalId).toBe('pubsub_evt_9988');
      expect(cmd.entityType).toBe('ORDER');
      expect(cmd.correlationId).toBe('corr-pubsub-1');
      expect(cmd.syncHash).toBeDefined();
    });
  });

  describe('Outbound Business Message Send (MAILBOX_SEND)', () => {
    it('dispatches outbound business email in simulation mode', async () => {
      adapter.setSimulationMode(true);

      const result = await adapter.executeSync({
        jobId: 'job-send-01',
        jobType: 'MAILBOX_SEND',
        direction: 'OUTBOUND',
        correlationId: 'corr-send-1',
        payload: {
          to: 'workshop@aucklandrepairs.co.nz',
          subject: 'Pinnacle Parts - Quote RFQ-8821 Confirmation',
          bodyText: 'Please find attached the official parts quote for Toyota RAV4 seat belt assembly.',
        },
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBeDefined();
      expect(result.data?.status).toBe('SENT');
      expect(result.data?.recipient).toBe('workshop@aucklandrepairs.co.nz');
      expect(result.data?.subject).toContain('Quote RFQ-8821');
    });

    it('rejects email missing valid recipient', async () => {
      adapter.setSimulationMode(true);

      const result = await adapter.executeSync({
        jobId: 'job-send-err1',
        jobType: 'MAILBOX_SEND',
        direction: 'OUTBOUND',
        correlationId: 'corr-send-err1',
        payload: {
          to: 'invalid-email-address',
          subject: 'Quote Confirmation',
        },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('requires a valid recipient email address');
    });

    it('rejects email missing subject line', async () => {
      adapter.setSimulationMode(true);

      const result = await adapter.executeSync({
        jobId: 'job-send-err2',
        jobType: 'MAILBOX_SEND',
        direction: 'OUTBOUND',
        correlationId: 'corr-send-err2',
        payload: {
          to: 'trade@repairer.co.nz',
          subject: '',
        },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('requires a subject line');
    });

    it('blocks live API send when credentials are unconfigured', async () => {
      adapter.setSimulationMode(false);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GmailMailboxAdapter,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(null) },
          },
        ],
      }).compile();

      const unconfigured = module.get<GmailMailboxAdapter>(GmailMailboxAdapter);

      const result = await unconfigured.executeSync({
        jobId: 'job-send-unauth',
        jobType: 'MAILBOX_SEND',
        direction: 'OUTBOUND',
        correlationId: 'corr-send-unauth',
        payload: {
          to: 'trade@repairer.co.nz',
          subject: 'Pinnacle Quote RFQ',
          bodyText: 'Quote content',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gmail live API call blocked: Unconfigured credentials');
    });
  });

  describe('Inbound Mailbox Read Sync & Privacy Enforcement', () => {
    it('enforces mandatory business filter and returns trade orders in simulation mode', async () => {
      adapter.setSimulationMode(true);

      const result = await adapter.executeSync({
        jobId: 'job-read-01',
        jobType: 'MAILBOX_READ_SYNC',
        direction: 'INBOUND',
        correlationId: 'corr-read-1',
        payload: {},
      });

      expect(result.success).toBe(true);
      expect(result.data?.queryExecuted).toBe(MANDATORY_BUSINESS_EMAIL_FILTER);
      expect(result.data?.privacyNotice).toContain('Zero unrelated emails read');

      const orders = result.data?.orders as any[];
      expect(orders).toBeDefined();
      expect(orders.length).toBeGreaterThanOrEqual(1);
      expect(orders[0].from).toBe('claims@iag.co.nz');
      expect(orders[0].extractedOrder.quoteId).toBe('RFQ-9812');
    });

    it('sanitizes broad or non-trade search query to protect privacy of unrelated emails', async () => {
      adapter.setSimulationMode(true);

      const result = await adapter.executeSync({
        jobId: 'job-read-sanitized',
        jobType: 'MAILBOX_READ_SYNC',
        direction: 'INBOUND',
        correlationId: 'corr-read-2',
        payload: {
          queryFilter: 'label:INBOX', // Attempted broad inbox query without business filter
        },
      });

      expect(result.success).toBe(true);
      // Verify query is strictly constrained to mandatory business filter
      expect(result.data?.queryExecuted).toContain(MANDATORY_BUSINESS_EMAIL_FILTER);
    });
  });

  describe('Duplicate Event Handling & Idempotency', () => {
    it('detects duplicate Pub/Sub messageId and returns idempotent success', async () => {
      adapter.setSimulationMode(true);

      const input = {
        jobId: 'job-dedup-1',
        jobType: 'ORDERS_IMPORT',
        direction: 'INBOUND' as const,
        correlationId: 'corr-dedup-1',
        payload: {
          messageId: 'pubsub_unique_msg_5501',
        },
      };

      // First execution
      const firstResult = await adapter.executeSync(input);
      expect(firstResult.success).toBe(true);
      expect(firstResult.data?.deduplicated).toBeUndefined();

      // Immediate duplicate delivery
      const duplicateResult = await adapter.executeSync(input);
      expect(duplicateResult.success).toBe(true);
      expect(duplicateResult.data?.deduplicated).toBe(true);
      expect(duplicateResult.data?.message).toContain('already processed');
    });
  });

  describe('Token Expiry, Refresh & Revocation Handling', () => {
    it('executes proactive token refresh in simulation mode', async () => {
      adapter.setSimulationMode(true);

      const result = await adapter.executeSync({
        jobId: 'job-refresh-01',
        jobType: 'TOKEN_REFRESH',
        direction: 'OUTBOUND',
        correlationId: 'corr-refresh-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.accessTokenRefreshed).toBe(true);
    });

    it('classifies revoked consent (invalid_grant) as non-transient actionable error', async () => {
      adapter.setSimulationMode(true);
      adapter.setSimulatedRevokedConsent(true);

      const result = await adapter.executeSync({
        jobId: 'job-revoked-01',
        jobType: 'MAILBOX_SEND',
        direction: 'OUTBOUND',
        correlationId: 'corr-revoked-1',
        payload: {
          to: 'trade@repairer.co.nz',
          subject: 'Pinnacle Parts Quote',
        },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('Gmail OAuth Authorization Revoked: invalid_grant');
    });
  });

  describe('Error Classification & Rate Limiting', () => {
    it('classifies HTTP 429 quota exhaustion as transient backoff trigger', async () => {
      adapter.setSimulatedRateLimitFailure(true);

      const result = await adapter.executeSync({
        jobId: 'job-rate-limit',
        jobType: 'MAILBOX_SEND',
        direction: 'OUTBOUND',
        correlationId: 'corr-rate-limit',
        payload: {
          to: 'trade@repairer.co.nz',
          subject: 'Pinnacle Parts Quote',
        },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(true);
      expect(result.error).toContain('HTTP 429');
    });

    it('classifies HTTP 504 gateway timeout as transient error', async () => {
      adapter.setSimulatedTransientFailure(true);

      const result = await adapter.executeSync({
        jobId: 'job-timeout',
        jobType: 'MAILBOX_READ_SYNC',
        direction: 'INBOUND',
        correlationId: 'corr-timeout',
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(true);
      expect(result.error).toContain('HTTP 504');
    });

    it('classifies send failure (HTTP 503) as transient', async () => {
      adapter.setSimulationMode(true);
      adapter.setSimulatedSendFailure(true);

      const result = await adapter.executeSync({
        jobId: 'job-send-503',
        jobType: 'MAILBOX_SEND',
        direction: 'OUTBOUND',
        correlationId: 'corr-send-503',
        payload: {
          to: 'trade@repairer.co.nz',
          subject: 'Pinnacle Parts Quote',
        },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(true);
      expect(result.error).toContain('HTTP 503');
    });
  });
});

