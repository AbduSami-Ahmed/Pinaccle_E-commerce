import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PartsTraderAdapter, PartsTraderQuotePayload } from './partstrader.adapter';

describe('PartsTraderAdapter', () => {
  let adapter: PartsTraderAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartsTraderAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'PARTSTRADER_SUPPLIER_ID') return 'PT-NZ-SUPP-8821';
              if (key === 'PARTSTRADER_API_KEY') return 'test_pt_api_key_secure_1234';
              if (key === 'PARTSTRADER_API_SECRET') return 'test_pt_api_secret_5678';
              if (key === 'PARTSTRADER_ENVIRONMENT') return 'sandbox';
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<PartsTraderAdapter>(PartsTraderAdapter);
  });

  describe('Capabilities & Definition', () => {
    it('declares correct providerKey and procurement capabilities', () => {
      expect(adapter.providerKey).toBe('PARTSTRADER');
      expect(adapter.displayName).toBe('PartsTrader Procurement (NZ)');
      expect(adapter.isMock).toBe(false);
      expect(adapter.capabilities).toContain('ORDERS_IMPORT');
      expect(adapter.capabilities).toContain('ORDERS_STATUS_UPDATE');
      expect(adapter.capabilities).toContain('WEBHOOK_INGESTION');
    });
  });

  describe('Credential Validation', () => {
    it('validates present and complete supplier credentials', async () => {
      adapter.setSimulationMode(true);
      const valid = await adapter.validateCredentials({
        supplierId: 'PT-SUPP-101',
        apiKey: 'secure_pt_api_key_9999',
      });
      expect(valid).toBe(true);
    });

    it('rejects incomplete, empty, or missing credentials', async () => {
      const totallyMissing = await adapter.validateCredentials(null as any);
      expect(totallyMissing).toBe(false);

      const emptyKey = await adapter.validateCredentials({
        supplierId: 'PT-SUPP-101',
        apiKey: '',
      });
      expect(emptyKey).toBe(false);

      const shortSupplier = await adapter.validateCredentials({
        supplierId: 'P',
        apiKey: 'secure_pt_api_key_9999',
      });
      expect(shortSupplier).toBe(false);
    });
  });

  describe('Webhook Verification & Replay Protection', () => {
    const secret = 'pt_webhook_signing_secret_9988';
    const payload = JSON.stringify({
      eventType: 'PARTSTRADER_ORDER_AWARDED',
      purchaseOrderId: 'PO-PT-99120',
      claimNumber: 'CLM-NZ-882194',
    });

    it('verifies valid HMAC-SHA256 signature and fresh timestamp', async () => {
      const currentUnix = Math.floor(Date.now() / 1000);
      const hmacSignature = createHmac('sha256', secret).update(payload).digest('hex');

      const result = await adapter.verifyWebhookSignature(
        payload,
        {
          'x-partstrader-signature': hmacSignature,
          'x-partstrader-timestamp': String(currentUnix),
        },
        secret,
      );

      expect(result.isValid).toBe(true);
      expect(result.timestamp).toBe(currentUnix);
    });

    it('rejects missing signature header', async () => {
      const result = await adapter.verifyWebhookSignature(payload, {}, secret);
      expect(result.isValid).toBe(false);
      expect(result.failureReason).toMatch(/Missing X-PARTSTRADER-SIGNATURE/i);
    });

    it('rejects signature mismatch', async () => {
      const currentUnix = Math.floor(Date.now() / 1000);
      const result = await adapter.verifyWebhookSignature(
        payload,
        {
          'x-partstrader-signature': 'invalid_forged_signature_hex',
          'x-partstrader-timestamp': String(currentUnix),
        },
        secret,
      );

      expect(result.isValid).toBe(false);
      expect(result.failureReason).toContain('Cryptographic HMAC signature mismatch');
    });

    it('detects and rejects expired webhook replay outside 5-minute window', async () => {
      const staleUnix = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago (> 300s window)
      const hmacSignature = createHmac('sha256', secret).update(payload).digest('hex');

      const result = await adapter.verifyWebhookSignature(
        payload,
        {
          'x-partstrader-signature': hmacSignature,
          'x-partstrader-timestamp': String(staleUnix),
        },
        secret,
      );

      expect(result.isValid).toBe(false);
      expect(result.isReplay).toBe(true);
      expect(result.failureReason).toContain('5-minute replay window');
    });
  });

  describe('Webhook Inbound Transformation', () => {
    it('transforms order awarded event into InternalIntegrationCommand', () => {
      const rawPayload = {
        eventType: 'PARTSTRADER_ORDER_AWARDED',
        purchaseOrderId: 'PO-PT-77610',
        data: {
          repairer: 'Penrose Collision Repairers',
          totalAmount: 550.0,
        },
      };

      const cmd = adapter.transformInboundWebhook(rawPayload, {}, 'corr-test-123');

      expect(cmd.eventType).toBe('PARTSTRADER_ORDER_AWARDED');
      expect(cmd.externalId).toBe('PO-PT-77610');
      expect(cmd.entityType).toBe('ORDER');
      expect(cmd.correlationId).toBe('corr-test-123');
      expect(cmd.syncHash).toBeDefined();
    });
  });

  describe('Purchase Order Import (ORDERS_IMPORT)', () => {
    it('imports and normalizes purchase orders in simulation mode with NZ localization', async () => {
      adapter.setSimulationMode(true);

      const result = await adapter.executeSync({
        jobId: 'job-po-01',
        jobType: 'ORDERS_IMPORT',
        direction: 'INBOUND',
        correlationId: 'pt-corr-po-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.importedCount).toBe(1);

      const orders = result.data?.orders as any[];
      expect(orders).toBeDefined();
      expect(orders.length).toBe(1);

      const order = orders[0];
      expect(order.orderSource).toBe('PARTSTRADER_B2B');
      expect(order.currency).toBe('NZD');
      expect(order.customerName).toBe('Penrose Collision Repairers Ltd');
      expect(order.shippingAddress.city).toBe('Penrose');
      expect(order.shippingAddress.state).toBe('Auckland');
      expect(order.shippingAddress.country).toBe('NZ');
      expect(order.metadata.claimNumber).toBe('CLM-NZ-882194');
      expect(order.items[0].sku).toBe('BELT-TOY-RAV4-FR-01');
      expect(order.items[0].unitPrice).toBe(480.0);
    });

    it('blocks unauthenticated live API calls when credentials are missing', async () => {
      adapter.setSimulationMode(false);

      // Create adapter with empty config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PartsTraderAdapter,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(null) },
          },
        ],
      }).compile();

      const unconfiguredAdapter = module.get<PartsTraderAdapter>(PartsTraderAdapter);

      const result = await unconfiguredAdapter.executeSync({
        jobId: 'job-po-unauth',
        jobType: 'ORDERS_IMPORT',
        direction: 'INBOUND',
        correlationId: 'corr-unauth',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('PartsTrader live API call blocked: Unconfigured credentials');
    });
  });

  describe('Fulfillment Dispatch Update (ORDERS_STATUS_UPDATE)', () => {
    it('records dispatch and courier tracking in simulation mode', async () => {
      adapter.setSimulationMode(true);

      const result = await adapter.executeSync({
        jobId: 'job-disp-01',
        jobType: 'ORDERS_STATUS_UPDATE',
        direction: 'OUTBOUND',
        correlationId: 'pt-corr-disp-1',
        payload: {
          purchaseOrderId: 'PO-PT-88211',
          carrierName: 'CourierPost / NZ Post',
          trackingNumber: 'CPNZ8841920NZ',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('DISPATCHED');
      expect(result.data?.carrierName).toBe('CourierPost / NZ Post');
      expect(result.data?.trackingNumber).toBe('CPNZ8841920NZ');
      expect(result.syncHash).toBeDefined();
    });

    it('rejects fulfillment payload missing tracking number', async () => {
      adapter.setSimulationMode(true);

      const result = await adapter.executeSync({
        jobId: 'job-disp-err',
        jobType: 'ORDERS_STATUS_UPDATE',
        direction: 'OUTBOUND',
        correlationId: 'pt-corr-disp-err',
        payload: {
          purchaseOrderId: 'PO-PT-88211',
          trackingNumber: '',
        },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('requires a valid shipment tracking number');
    });
  });

  describe('Quote Submission (QUOTE_SUBMIT)', () => {
    const validQuotePayload: PartsTraderQuotePayload = {
      quoteRequestId: 'PT-RFQ-88412',
      repairerWorkshop: 'Penrose Collision Centre',
      vehicle: {
        make: 'Toyota',
        model: 'RAV4',
        year: 2021,
        registrationPlate: 'NZ-RAV50',
      },
      items: [
        {
          partNumber: 'SB-TOY-RAV4-FR',
          description: 'Toyota RAV4 Front Right Seat Belt Assembly',
          quantityRequired: 1,
          available: true,
          quotedUnitPrice: 480.0,
          partCondition: 'RECYCLED_OEM',
          deliveryDays: 1,
        },
      ],
    };

    it('submits valid parts quote in simulation mode', async () => {
      adapter.setSimulationMode(true);

      const result = await adapter.executeSync({
        jobId: 'job-qte-01',
        jobType: 'QUOTE_SUBMIT',
        direction: 'OUTBOUND',
        correlationId: 'pt-corr-qte-1',
        payload: validQuotePayload as any,
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('SUBMITTED');
      expect(result.data?.currency).toBe('NZD');
      expect(result.data?.quoteRequestId).toBe('PT-RFQ-88412');
      expect(result.data?.quotedItemsCount).toBe(1);
    });

    it('validates quote pricing is positive for available items', async () => {
      adapter.setSimulationMode(true);

      const invalidQuote: PartsTraderQuotePayload = {
        ...validQuotePayload,
        items: [
          {
            partNumber: 'SB-TOY-RAV4-FR',
            description: 'Toyota RAV4 Front Right Seat Belt Assembly',
            quantityRequired: 1,
            available: true,
            quotedUnitPrice: 0.0, // Invalid free quote
          },
        ],
      };

      const result = await adapter.executeSync({
        jobId: 'job-qte-invalid',
        jobType: 'QUOTE_SUBMIT',
        direction: 'OUTBOUND',
        correlationId: 'pt-corr-qte-err',
        payload: invalidQuote as any,
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('must be greater than $0.00 NZD');
    });
  });

  describe('Manual Batch Import Workflow', () => {
    it('parses offline CSV portal export file', async () => {
      const csvContent = [
        'purchaseOrderId,repairerName,claimNumber,partNumber,unitPrice,status',
        'PT-PO-1001,"Auckland City Smash Repairs",CLM-AKL-1234,BELT-TOY-01,350.00,AWARDED',
        'PT-PO-1002,"Christchurch Panel & Paint",CLM-CHC-5678,TYR-BRI-02,185.00,AWARDED',
      ].join('\n');

      const result = await adapter.executeSync({
        jobId: 'job-manual-01',
        jobType: 'MANUAL_BATCH_IMPORT',
        direction: 'INBOUND',
        correlationId: 'corr-batch-1',
        payload: { fileContent: csvContent },
      });

      expect(result.success).toBe(true);
      expect(result.data?.source).toBe('MANUAL_BATCH_CSV');
      expect(result.data?.recordCount).toBe(2);
      expect(result.syncHash).toBeDefined();
    });

    it('rejects batch import without file content', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-manual-err',
        jobType: 'MANUAL_BATCH_IMPORT',
        direction: 'INBOUND',
        correlationId: 'corr-batch-err',
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
        jobType: 'ORDERS_IMPORT',
        direction: 'INBOUND',
        correlationId: 'corr-ratelimit',
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(true);
      expect(result.error).toContain('HTTP 429');
    });

    it('classifies HTTP 504 gateway timeout as transient', async () => {
      adapter.setSimulatedTransientFailure(true);

      const result = await adapter.executeSync({
        jobId: 'job-timeout',
        jobType: 'ORDERS_IMPORT',
        direction: 'INBOUND',
        correlationId: 'corr-timeout',
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(true);
      expect(result.error).toContain('HTTP 504');
    });
  });
});
