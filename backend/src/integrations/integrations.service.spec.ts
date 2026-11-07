import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoSecretsService } from './core/crypto-secrets.service';
import { ProviderRegistryService } from './core/provider-registry.service';
import { MockIntegrationAdapter } from './adapters/mock-integration.adapter';

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let mockAdapter: MockIntegrationAdapter;

  let prisma: {
    integrationAccount: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      upsert: jest.Mock;
      updateMany: jest.Mock;
    };
    integrationSyncEvent: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    integrationSyncJob: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    externalIdMapping: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const secret = 'mock-test-webhook-secret-key';

  beforeEach(async () => {
    mockAdapter = new MockIntegrationAdapter();

    prisma = {
      integrationAccount: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      integrationSyncEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      integrationSyncJob: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      externalIdMapping: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        { provide: PrismaService, useValue: prisma },
        CryptoSecretsService,
        {
          provide: ProviderRegistryService,
          useValue: new ProviderRegistryService(mockAdapter),
        },
        { provide: MockIntegrationAdapter, useValue: mockAdapter },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-integration-secrets-key-32b!'),
          },
        },
      ],
    }).compile();

    service = module.get<IntegrationsService>(IntegrationsService);
  });

  describe('listAccounts', () => {
    it('returns known providers with zero secret exposure and no false live connections', async () => {
      prisma.integrationAccount.findMany.mockResolvedValue([]);

      const accounts = await service.listAccounts();

      expect(accounts.length).toBeGreaterThanOrEqual(7);

      // Verify no decrypted credentials or raw keys exist in response
      for (const acc of accounts) {
        expect((acc as any).encryptedSecrets).toBeUndefined();
        expect((acc as any).apiSecret).toBeUndefined();
      }

      // Live providers must remain DISCONNECTED in Phase 15
      const tradeMe = accounts.find((a) => a.provider === 'TRADE_ME');
      expect(tradeMe).toBeDefined();
      expect(tradeMe?.status).toBe('DISCONNECTED');
      expect(tradeMe?.isActive).toBe(false);

      const ebay = accounts.find((a) => a.provider === 'EBAY');
      expect(ebay?.status).toBe('DISCONNECTED');
    });
  });

  describe('handleWebhook', () => {
    it('ingests valid signed mock webhook, transforms schema, and records sync event', async () => {
      const payload = {
        eventType: 'order.imported',
        externalId: 'EXT-ORD-1001',
        data: { total: 450.0, sku: 'TYRE-BRI-01' },
      };

      const signed = mockAdapter.generateSignedMockWebhook(payload, secret);

      prisma.integrationAccount.findFirst.mockResolvedValue({
        id: 'acc-mock',
        provider: 'MOCK_MARKETPLACE',
        isActive: true,
        encryptedSecrets: null,
      });

      prisma.integrationSyncEvent.findUnique.mockResolvedValue(null);
      prisma.integrationSyncEvent.create.mockResolvedValue({ id: 'evt-1' });
      prisma.integrationSyncJob.create.mockResolvedValue({ id: 'job-1' });
      prisma.externalIdMapping.upsert.mockResolvedValue({
        id: 'map-1',
        provider: 'MOCK_MARKETPLACE',
        entityType: 'ORDER',
        internalId: 'EXT-ORD-1001',
        externalId: 'EXT-ORD-1001',
        lastSyncedAt: new Date(),
      });

      const result = await service.handleWebhook('MOCK_MARKETPLACE', signed.payload, signed.headers);

      expect(result.received).toBe(true);
      expect(result.status).toBe('PROCESSED');
      expect(result.correlationId).toBeDefined();
      expect(prisma.integrationSyncEvent.create).toHaveBeenCalled();
      expect(prisma.integrationSyncJob.create).toHaveBeenCalled();
    });

    it('enforces idempotency: duplicate webhook delivery is ignored without duplicate jobs', async () => {
      const payload = { eventId: 'evt_unique_12345', data: { value: 10 } };
      const signed = mockAdapter.generateSignedMockWebhook(payload, secret);

      prisma.integrationAccount.findFirst.mockResolvedValue({
        id: 'acc-mock',
        provider: 'MOCK_MARKETPLACE',
        isActive: true,
      });

      // Existing event already found
      prisma.integrationSyncEvent.findUnique.mockResolvedValue({
        id: 'evt-existing',
        idempotencyKey: 'evt_unique_12345',
        status: 'PROCESSED',
      });

      const result = await service.handleWebhook('MOCK_MARKETPLACE', signed.payload, signed.headers);

      expect(result.received).toBe(true);
      expect(result.status).toBe('DUPLICATE_IGNORED');
      expect(prisma.integrationSyncEvent.create).not.toHaveBeenCalled();
      expect(prisma.integrationSyncJob.create).not.toHaveBeenCalled();
    });

    it('rejects forged webhook signature', async () => {
      const payload = { data: 'test' };
      const signed = mockAdapter.generateSignedMockWebhook(payload, secret);
      const forgedHeaders = {
        ...signed.headers,
        'x-mock-signature': 'forged_bad_signature_hash',
      };

      prisma.integrationAccount.findFirst.mockResolvedValue({
        id: 'acc-mock',
        provider: 'MOCK_MARKETPLACE',
        isActive: true,
      });

      const result = await service.handleWebhook('MOCK_MARKETPLACE', signed.payload, forgedHeaders);

      expect(result.received).toBe(false);
      expect(result.status).toBe('INVALID_SIGNATURE');
    });

    it('rejects replayed webhook with timestamp older than 300s', async () => {
      const payload = { data: 'test' };
      const stale = mockAdapter.generateSignedMockWebhook(payload, secret, -320);

      prisma.integrationAccount.findFirst.mockResolvedValue({
        id: 'acc-mock',
        provider: 'MOCK_MARKETPLACE',
        isActive: true,
      });

      const result = await service.handleWebhook('MOCK_MARKETPLACE', stale.payload, stale.headers);

      expect(result.received).toBe(false);
      expect(result.status).toBe('REPLAY_REJECTED');
    });
  });

  describe('executeSyncJob and retry/dead-letter engine', () => {
    it('completes sync job on success', async () => {
      prisma.integrationSyncJob.findUnique.mockResolvedValue({
        id: 'job-1',
        integrationAccountId: 'acc-1',
        jobType: 'CATALOG_PUBLISH',
        direction: 'OUTBOUND',
        status: 'PENDING',
        attempts: 0,
        maxAttempts: 5,
        correlationId: 'corr-101',
        account: { provider: 'MOCK_MARKETPLACE' },
      });

      prisma.integrationSyncJob.update
        .mockResolvedValueOnce({ id: 'job-1', status: 'PROCESSING' })
        .mockResolvedValueOnce({
          id: 'job-1',
          integrationAccountId: 'acc-1',
          jobType: 'CATALOG_PUBLISH',
          direction: 'OUTBOUND',
          status: 'COMPLETED',
          attempts: 1,
          maxAttempts: 5,
          correlationId: 'corr-101',
          createdAt: new Date(),
          account: { provider: 'MOCK_MARKETPLACE' },
        });

      const result = await service.executeSyncJob('job-1');

      expect(result.status).toBe('COMPLETED');
    });

    it('transitions job to DEAD_LETTER after repeated failures reaching maxAttempts', async () => {
      mockAdapter.setSimulateTransientError(true);

      prisma.integrationSyncJob.findUnique.mockResolvedValue({
        id: 'job-fail',
        integrationAccountId: 'acc-1',
        jobType: 'CATALOG_PUBLISH',
        direction: 'OUTBOUND',
        status: 'PROCESSING',
        attempts: 4, // 5th attempt will exceed maxAttempts (5)
        maxAttempts: 5,
        correlationId: 'corr-999',
        account: { provider: 'MOCK_MARKETPLACE' },
      });

      prisma.integrationSyncJob.update
        .mockResolvedValueOnce({ id: 'job-fail', status: 'PROCESSING' })
        .mockResolvedValueOnce({
          id: 'job-fail',
          integrationAccountId: 'acc-1',
          jobType: 'CATALOG_PUBLISH',
          direction: 'OUTBOUND',
          status: 'DEAD_LETTER',
          attempts: 5,
          maxAttempts: 5,
          correlationId: 'corr-999',
          lastError: 'Simulated 429 Rate Limit Exceeded (Mock Transient Failure)',
          createdAt: new Date(),
          account: { provider: 'MOCK_MARKETPLACE' },
        });

      const result = await service.executeSyncJob('job-fail');

      expect(result.status).toBe('DEAD_LETTER');
    });
  });

  describe('createOrUpdateMapping (anti-loop hash)', () => {
    it('stores external ID mapping with syncHash to detect echo updates', async () => {
      prisma.externalIdMapping.upsert.mockResolvedValue({
        id: 'map-10',
        provider: 'SHOPIFY',
        entityType: 'PRODUCT',
        internalId: 'prod-uuid-1',
        externalId: 'sh_998811',
        externalVersion: '1.0',
        syncHash: 'abc123sha256hash',
        lastSyncedAt: new Date(),
      });

      const mapping = await service.createOrUpdateMapping({
        provider: 'SHOPIFY',
        entityType: 'PRODUCT',
        internalId: 'prod-uuid-1',
        externalId: 'sh_998811',
        syncHash: 'abc123sha256hash',
      });

      expect(mapping.provider).toBe('SHOPIFY');
      expect(mapping.syncHash).toBe('abc123sha256hash');
    });
  });
});
