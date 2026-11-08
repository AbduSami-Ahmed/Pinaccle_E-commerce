import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { CapEziAdapter } from './capezi.adapter';

describe('CapEziAdapter', () => {
  let adapter: CapEziAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapEziAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CAP_EZI_CLIENT_ID') return 'CAP-NZ-CL-8812';
              if (key === 'CAP_EZI_API_KEY') return 'test_capezi_secret_token_1234';
              if (key === 'CAP_EZI_API_SECRET') return 'test_capezi_webhook_secret_5678';
              if (key === 'CAP_EZI_ENVIRONMENT') return 'sandbox';
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<CapEziAdapter>(CapEziAdapter);
  });

  describe('Capabilities & Definition', () => {
    it('declares correct providerKey and reference catalog capabilities', () => {
      expect(adapter.providerKey).toBe('CAP_EZI');
      expect(adapter.displayName).toBe('CAP Ezi Parts & Interchange Catalogue');
      expect(adapter.isMock).toBe(false);
      expect(adapter.capabilities).toContain('VEHICLE_FITMENT_QUERY');
      expect(adapter.capabilities).toContain('INVENTORY_SYNC_INBOUND');
      expect(adapter.capabilities).not.toContain('CATALOG_PUBLISH'); // Read-only reference catalog
    });
  });

  describe('Credential Validation', () => {
    it('validates present and structurally sound client credentials in simulation mode', async () => {
      adapter.setSimulationMode(true);
      const valid = await adapter.validateCredentials({
        clientId: 'CL-8891',
        apiKey: 'secure_capezi_api_token_1234',
      });
      expect(valid).toBe(true);
    });

    it('rejects incomplete, empty, or missing credentials', async () => {
      const totallyMissing = await adapter.validateCredentials(null as any);
      expect(totallyMissing).toBe(false);

      const emptyKey = await adapter.validateCredentials({
        clientId: 'CL-8891',
        apiKey: '',
      });
      expect(emptyKey).toBe(false);

      const shortId = await adapter.validateCredentials({
        clientId: 'C',
        apiKey: 'secure_capezi_api_token_1234',
      });
      expect(shortId).toBe(false);
    });
  });

  describe('Webhook & Catalog Delta Verification', () => {
    const secret = 'capezi_delta_secret_123';
    const payload = JSON.stringify({
      eventType: 'CAP_EZI_CATALOG_DELTA',
      feedId: 'FEED-NZ-2026-W45',
      updatedPartNumbers: ['73210-42180', '73220-42140'],
    });

    it('verifies valid HMAC-SHA256 signature and fresh timestamp', async () => {
      const currentUnix = Math.floor(Date.now() / 1000);
      const hmacSignature = createHmac('sha256', secret).update(payload).digest('hex');

      const result = await adapter.verifyWebhookSignature(
        payload,
        {
          'x-capezi-signature': hmacSignature,
          'x-capezi-timestamp': String(currentUnix),
        },
        secret,
      );

      expect(result.isValid).toBe(true);
      expect(result.timestamp).toBe(currentUnix);
    });

    it('rejects missing signature header', async () => {
      const result = await adapter.verifyWebhookSignature(payload, {}, secret);
      expect(result.isValid).toBe(false);
      expect(result.failureReason).toContain('Missing X-CAPEZi-Signature');
    });

    it('rejects signature mismatch', async () => {
      const currentUnix = Math.floor(Date.now() / 1000);
      const result = await adapter.verifyWebhookSignature(
        payload,
        {
          'x-capezi-signature': 'tampered_bad_signature_hex',
          'x-capezi-timestamp': String(currentUnix),
        },
        secret,
      );

      expect(result.isValid).toBe(false);
      expect(result.failureReason).toContain('Cryptographic HMAC signature mismatch');
    });

    it('detects and rejects expired catalog notification replay outside 5-minute window', async () => {
      const staleUnix = Math.floor(Date.now() / 1000) - 350; // 350 seconds ago (> 300s window)
      const hmacSignature = createHmac('sha256', secret).update(payload).digest('hex');

      const result = await adapter.verifyWebhookSignature(
        payload,
        {
          'x-capezi-signature': hmacSignature,
          'x-capezi-timestamp': String(staleUnix),
        },
        secret,
      );

      expect(result.isValid).toBe(false);
      expect(result.isReplay).toBe(true);
      expect(result.failureReason).toContain('5-minute replay window');
    });
  });

  describe('Webhook Inbound Transformation', () => {
    it('transforms catalog delta notification into InternalIntegrationCommand', () => {
      const rawPayload = {
        eventType: 'CAP_EZI_CATALOG_DELTA',
        catalogVersion: '2026.11.08',
        data: {
          categoriesUpdated: ['Seat Belts', 'Airbags'],
        },
      };

      const cmd = adapter.transformInboundWebhook(rawPayload, {}, 'corr-capezi-123');

      expect(cmd.eventType).toBe('CAP_EZI_CATALOG_DELTA');
      expect(cmd.externalId).toBe('2026.11.08');
      expect(cmd.entityType).toBe('PRODUCT');
      expect(cmd.correlationId).toBe('corr-capezi-123');
      expect(cmd.syncHash).toBeDefined();
    });
  });

  describe('Vehicle Fitment Query (VEHICLE_FITMENT_QUERY)', () => {
    it('returns supersession chain and compatible vehicle hierarchy in simulation mode', async () => {
      adapter.setSimulationMode(true);

      const result = await adapter.executeSync({
        jobId: 'job-fitment-01',
        jobType: 'VEHICLE_FITMENT_QUERY',
        direction: 'INBOUND',
        correlationId: 'capezi-corr-fit-1',
        payload: {
          oemPartNumber: '73210-42180',
        },
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('73210-42180');
      expect(result.syncHash).toBeDefined();

      const data = result.data as any;
      expect(data).toBeDefined();
      expect(data.oemPartNumber).toBe('73210-42180');
      expect(data.category).toBe('Safety & Restraints');
      expect(data.supersessionChain).toBeDefined();
      expect(data.supersessionChain.length).toBeGreaterThanOrEqual(1);

      // Verify NZ-localized vehicle fitment tree
      expect(data.compatibleVehicles).toBeDefined();
      expect(data.compatibleVehicles[0].make).toBe('Toyota');
      expect(data.compatibleVehicles[0].model).toBe('RAV4');
      expect(data.compatibleVehicles[0].notes).toContain('Right-hand drive New Zealand specification');

      // Verify NZD benchmark price
      expect(data.benchmarkPriceReferenceNZD.currency).toBe('NZD');
      expect(data.benchmarkPriceReferenceNZD.gstInclusive).toBe(true);

      // Verify IP licensing disclaimer
      expect(data.licensingDisclaimer).toContain('CAP Ezi (Infomedia) proprietary data');
    });

    it('rejects fitment query missing both OEM part number and VIN', async () => {
      adapter.setSimulationMode(true);

      const result = await adapter.executeSync({
        jobId: 'job-fitment-err',
        jobType: 'VEHICLE_FITMENT_QUERY',
        direction: 'INBOUND',
        correlationId: 'capezi-corr-err',
        payload: {},
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('requires either oemPartNumber or vin');
    });

    it('blocks unauthenticated live API calls when credentials are unconfigured', async () => {
      adapter.setSimulationMode(false);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CapEziAdapter,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(null) },
          },
        ],
      }).compile();

      const unconfiguredAdapter = module.get<CapEziAdapter>(CapEziAdapter);

      const result = await unconfiguredAdapter.executeSync({
        jobId: 'job-fitment-unauth',
        jobType: 'VEHICLE_FITMENT_QUERY',
        direction: 'INBOUND',
        correlationId: 'capezi-corr-unauth',
        payload: { oemPartNumber: '73210-42180' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('CAP Ezi live API call blocked: Unconfigured credentials');
    });
  });

  describe('Batch Interchange Feed Import (INVENTORY_SYNC_INBOUND)', () => {
    it('ingests structured CSV interchange feed into normalized records with licensing disclaimer', async () => {
      const csvFeed = [
        'oemPartNumber,supersededPartNumbers,interchangeGroupCode,partDescription,applicableMakes,applicableModels,yearFrom,yearTo,engineCodes',
        '73210-42180,73210-42170;73210-42160,GRP-TOY-SB-RAV4,"Front RH Seat Belt Tensioner",Toyota,RAV4;Harrier,2019,2024,A25A-FXS',
        '84820-02190,84820-02180,GRP-TOY-PWS-COR,"Master Power Window Switch",Toyota,Corolla,2018,2023,2ZR-FE',
      ].join('\n');

      const result = await adapter.executeSync({
        jobId: 'job-feed-01',
        jobType: 'INVENTORY_SYNC_INBOUND',
        direction: 'INBOUND',
        correlationId: 'capezi-corr-feed-1',
        payload: { fileContent: csvFeed },
      });

      expect(result.success).toBe(true);
      expect(result.data?.source).toBe('CAP_EZI_SANCTIONED_BATCH_FEED');
      expect(result.data?.recordCount).toBe(2);
      expect(result.data?.disclaimer).toContain('Redistribution prohibited');
      expect(result.syncHash).toBeDefined();
    });

    it('rejects batch import without file content', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-feed-err',
        jobType: 'INVENTORY_SYNC_INBOUND',
        direction: 'INBOUND',
        correlationId: 'capezi-corr-feed-err',
        payload: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires fileContent string in payload');
    });
  });

  describe('Error Classification & Backoff', () => {
    it('classifies HTTP 429 as transient with backoff trigger', async () => {
      adapter.setSimulatedRateLimitFailure(true);

      const result = await adapter.executeSync({
        jobId: 'job-rate-limit',
        jobType: 'VEHICLE_FITMENT_QUERY',
        direction: 'INBOUND',
        correlationId: 'corr-ratelimit',
        payload: { oemPartNumber: '73210-42180' },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(true);
      expect(result.error).toContain('HTTP 429');
    });

    it('classifies HTTP 504 gateway timeout as transient', async () => {
      adapter.setSimulatedTransientFailure(true);

      const result = await adapter.executeSync({
        jobId: 'job-timeout',
        jobType: 'VEHICLE_FITMENT_QUERY',
        direction: 'INBOUND',
        correlationId: 'corr-timeout',
        payload: { oemPartNumber: '73210-42180' },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(true);
      expect(result.error).toContain('HTTP 504');
    });
  });
});

