import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { EbayAdapter, EbayListingPayload } from './ebay.adapter';

describe('EbayAdapter', () => {
  let adapter: EbayAdapter;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EbayAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'EBAY_CLIENT_ID') return 'test_ebay_client_id_12345';
              if (key === 'EBAY_CLIENT_SECRET') return 'test_ebay_client_secret_67890';
              if (key === 'EBAY_ENVIRONMENT') return 'sandbox';
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<EbayAdapter>(EbayAdapter);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Capabilities & Definition', () => {
    it('declares correct providerKey and marketplace capabilities', () => {
      expect(adapter.providerKey).toBe('EBAY');
      expect(adapter.isMock).toBe(false);
      expect(adapter.capabilities).toContain('CATALOG_PUBLISH');
      expect(adapter.capabilities).toContain('INVENTORY_SYNC_OUTBOUND');
      expect(adapter.capabilities).toContain('ORDERS_IMPORT');
      expect(adapter.capabilities).toContain('ORDERS_STATUS_UPDATE');
      expect(adapter.capabilities).toContain('WEBHOOK_INGESTION');
    });
  });

  describe('Credential Validation', () => {
    it('validates present and adequately-sized credentials', async () => {
      const valid = await adapter.validateCredentials({
        clientId: 'valid_client_id_12345',
        clientSecret: 'valid_client_secret_67890',
      });
      expect(valid).toBe(true);
    });

    it('rejects missing or empty credentials', async () => {
      const totallyMissing = await adapter.validateCredentials(null as any);
      expect(totallyMissing).toBe(false);

      const invalidShort = await adapter.validateCredentials({
        clientId: 'short',
        clientSecret: 'short',
      });
      expect(invalidShort).toBe(false);
    });
  });

  describe('Pre-Publication Listing Validation', () => {
    const validListing: EbayListingPayload = {
      sku: 'TYR-BRI-2055516-EP300',
      title: 'Bridgestone Ecopia EP300 205/55R16 91V Low Rolling Resistance Tyre',
      description: 'Brand new premium passenger tyre. Compliant with NZ road safety standards.',
      price: 185.0,
      currency: 'NZD',
      quantity: 8,
      categoryId: '179680', // Tyres category
      condition: 'NEW',
      imageUrls: ['https://storage.pinnacleparts.co.nz/products/ep300.jpg'],
      brand: 'Bridgestone',
      mpn: 'EP300-2055516',
    };

    it('approves a completely valid listing payload', () => {
      const result = adapter.validateListingPayload(validListing);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('enforces hard eBay title limit of 80 characters', () => {
      const longTitle = 'A'.repeat(81);
      const result = adapter.validateListingPayload({
        ...validListing,
        title: longTitle,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Listing Title exceeds eBay maximum limit of 80 characters');
      expect(result.errors[0]).toContain('81 characters');
    });

    it('rejects empty title or SKU', () => {
      const result = adapter.validateListingPayload({
        ...validListing,
        sku: '',
        title: '   ',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('SKU is required'))).toBe(true);
      expect(result.errors.some((e) => e.includes('Listing Title is required'))).toBe(true);
    });

    it('rejects non-positive price and negative quantity', () => {
      const result = adapter.validateListingPayload({
        ...validListing,
        price: -10,
        quantity: -2,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Listing Price must be a positive number'))).toBe(true);
      expect(result.errors.some((e) => e.includes('quantity must be a non-negative integer'))).toBe(true);
    });

    it('rejects missing or invalid image URLs', () => {
      const result = adapter.validateListingPayload({
        ...validListing,
        imageUrls: ['ftp://invalid.com/image.png'],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('must be an absolute HTTP/HTTPS URL'))).toBe(true);
    });

    it('rejects unrecognized condition values', () => {
      const result = adapter.validateListingPayload({
        ...validListing,
        condition: 'BOGUS_CONDITION_XYZ',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid eBay condition'))).toBe(true);
    });
  });

  describe('OAuth 2.0 Credential & Token Caching', () => {
    it('returns simulated OAuth token when simulation mode is active', async () => {
      adapter.setSimulationMode(true);
      const token = await adapter.getOAuthAccessToken({}, 'test-corr');
      expect(token).toContain('simulated_ebay_oauth_token');

      // Subsequent call within 2 hours must return cached token
      const token2 = await adapter.getOAuthAccessToken({}, 'test-corr');
      expect(token2).toBe(token);
    });

    it('throws clear blocker error when live credentials are unconfigured and simulation is off', async () => {
      adapter.setSimulationMode(false);
      jest.spyOn(configService, 'get').mockReturnValue(null);

      await expect(
        adapter.getOAuthAccessToken({ clientId: '', clientSecret: '' }, 'test-corr'),
      ).rejects.toThrow('Required OAuth credentials (EBAY_CLIENT_ID / EBAY_CLIENT_SECRET) are not configured');
    });
  });

  describe('Catalog Publication (CATALOG_PUBLISH)', () => {
    beforeEach(() => {
      adapter.setSimulationMode(true);
    });

    it('successfully publishes validated product and returns external listing ID', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-publish-1',
        jobType: 'CATALOG_PUBLISH',
        direction: 'OUTBOUND',
        correlationId: 'corr-pub-1',
        payload: {
          sku: 'TYR-BRI-2055516-EP300',
          title: 'Bridgestone Ecopia EP300 205/55R16',
          description: 'Top fuel efficiency tyre',
          price: 195.0,
          currency: 'NZD',
          quantity: 12,
          categoryId: '179680',
          condition: 'NEW',
          imageUrls: ['https://storage.pinnacleparts.co.nz/products/ep300.jpg'],
        },
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toMatch(/^ebay-listing-/);
      expect(result.syncHash).toBeDefined();
      expect(result.data?.['status']).toBe('PUBLISHED');
      expect(result.data?.['sku']).toBe('TYR-BRI-2055516-EP300');
    });

    it('aborts early and returns actionable error when listing validation fails', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-publish-invalid',
        jobType: 'CATALOG_PUBLISH',
        direction: 'OUTBOUND',
        correlationId: 'corr-pub-invalid',
        payload: {
          sku: 'TYR-BAD-01',
          title: 'Z'.repeat(95), // Exceeds 80 chars
          price: -50,
          quantity: 1,
          categoryId: '179680',
          condition: 'NEW',
          imageUrls: [],
        },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(false); // Schema error is non-transient
      expect(result.error).toContain('Listing Title exceeds eBay maximum limit of 80 characters');
      expect(result.error).toContain('Listing Price must be a positive number');
    });
  });

  describe('Inventory Synchronization (INVENTORY_SYNC_OUTBOUND)', () => {
    beforeEach(() => {
      adapter.setSimulationMode(true);
    });

    it('synchronizes updated stock quantity for SKU', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-inv-1',
        jobType: 'INVENTORY_SYNC_OUTBOUND',
        direction: 'OUTBOUND',
        correlationId: 'corr-inv-1',
        payload: {
          sku: 'TYR-BRI-2055516-EP300',
          quantity: 14,
        },
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('TYR-BRI-2055516-EP300');
      expect(result.data?.['syncedQuantity']).toBe(14);
      expect(result.data?.['status']).toBe('IN_STOCK');
    });

    it('rejects inventory sync with missing SKU or invalid quantity', async () => {
      const missingSku = await adapter.executeSync({
        jobId: 'job-inv-fail-1',
        jobType: 'INVENTORY_SYNC_OUTBOUND',
        direction: 'OUTBOUND',
        correlationId: 'corr-inv-fail-1',
        payload: { quantity: 10 },
      });
      expect(missingSku.success).toBe(false);
      expect(missingSku.error).toContain('requires a valid SKU');

      const negativeQty = await adapter.executeSync({
        jobId: 'job-inv-fail-2',
        jobType: 'INVENTORY_SYNC_OUTBOUND',
        direction: 'OUTBOUND',
        correlationId: 'corr-inv-fail-2',
        payload: { sku: 'TYR-01', quantity: -5 },
      });
      expect(negativeQty.success).toBe(false);
      expect(negativeQty.error).toContain('must be a non-negative number');
    });
  });

  describe('Order Import & Normalization (ORDERS_IMPORT)', () => {
    beforeEach(() => {
      adapter.setSimulationMode(true);
    });

    it('fetches unfulfilled orders and normalizes to internal canonical schema', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-orders-1',
        jobType: 'ORDERS_IMPORT',
        direction: 'INBOUND',
        correlationId: 'corr-orders-1',
      });

      expect(result.success).toBe(true);
      const orders = result.data?.['orders'] as any[];
      expect(orders).toBeDefined();
      expect(orders.length).toBeGreaterThan(0);

      const order = orders[0];
      expect(order.externalOrderId).toMatch(/^ebay-ord-/);
      expect(order.orderSource).toBe('EBAY_MARKETPLACE');
      expect(order.paymentStatus).toBe('PAID');
      expect(order.currency).toBe('NZD');
      expect(order.totalAmount).toBe(280.0);
      expect(order.shippingAddress.country).toBe('NZ');
      expect(order.items).toHaveLength(1);
      expect(order.items[0].sku).toBe('TYR-BRI-2055516-EP300');
    });
  });

  describe('Fulfillment Tracking Dispatch (ORDERS_STATUS_UPDATE)', () => {
    beforeEach(() => {
      adapter.setSimulationMode(true);
    });

    it('dispatches CourierPost tracking details to eBay order', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-fulfill-1',
        jobType: 'ORDERS_STATUS_UPDATE',
        direction: 'OUTBOUND',
        correlationId: 'corr-fulfill-1',
        payload: {
          orderId: 'ebay-1049281',
          carrierName: 'CourierPost',
          trackingNumber: 'NZP-8849201',
        },
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toMatch(/^fulfill-/);
      expect(result.data?.['carrierName']).toBe('CourierPost');
      expect(result.data?.['trackingNumber']).toBe('NZP-8849201');
      expect(result.data?.['status']).toBe('FULFILLED');
    });

    it('rejects fulfillment update missing tracking number', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-fulfill-bad',
        jobType: 'ORDERS_STATUS_UPDATE',
        direction: 'OUTBOUND',
        correlationId: 'corr-fulfill-bad',
        payload: {
          orderId: 'ebay-1049281',
          carrierName: 'CourierPost',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires a valid shipment tracking number');
    });
  });

  describe('Rate Limiting & Transient Error Backoff', () => {
    it('handles simulated rate limit 429 and marks error as transient', async () => {
      adapter.setSimulationMode(true);
      adapter.setSimulatedRateLimitFailure(true);

      const result = await adapter.executeSync({
        jobId: 'job-rate-1',
        jobType: 'INVENTORY_SYNC_OUTBOUND',
        direction: 'OUTBOUND',
        correlationId: 'corr-rate-1',
        payload: { sku: 'TYR-01', quantity: 5 },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(true);
      expect(result.error).toContain('HTTP 429 Too Many Requests');
    });

    it('handles simulated gateway timeout 504 and marks error as transient', async () => {
      adapter.setSimulationMode(true);
      adapter.setSimulatedTransientFailure(true);

      const result = await adapter.executeSync({
        jobId: 'job-504-1',
        jobType: 'CATALOG_PUBLISH',
        direction: 'OUTBOUND',
        correlationId: 'corr-504-1',
        payload: {
          sku: 'TYR-01',
          title: 'Valid Tyre Title',
          description: 'Desc',
          price: 150,
          quantity: 2,
          categoryId: '179680',
          condition: 'NEW',
          imageUrls: ['https://example.com/img.jpg'],
        },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(true);
      expect(result.error).toContain('HTTP 504');
    });
  });

  describe('Webhook & Signature Verification', () => {
    const secret = 'webhook_secret_key_ebay_2026';
    const payload = JSON.stringify({
      notificationId: 'notif-101',
      metadata: { topic: 'MARKETPLACE_ACCOUNT_DELETION' },
      data: { userId: 'usr-991', reason: 'GDPR / Privacy Request' },
    });

    it('verifies valid HMAC-SHA256 signature and fresh timestamp', async () => {
      const signature = createHmac('sha256', secret).update(payload).digest('hex');
      const currentUnix = Math.floor(Date.now() / 1000);

      const result = await adapter.verifyWebhookSignature(
        payload,
        {
          'x-ebay-signature': signature,
          'x-ebay-timestamp': String(currentUnix),
        },
        secret,
      );

      expect(result.isValid).toBe(true);
      expect(result.failureReason).toBeUndefined();
    });

    it('rejects invalid signature', async () => {
      const currentUnix = Math.floor(Date.now() / 1000);
      const result = await adapter.verifyWebhookSignature(
        payload,
        {
          'x-ebay-signature': 'bad_tampered_signature',
          'x-ebay-timestamp': String(currentUnix),
        },
        secret,
      );

      expect(result.isValid).toBe(false);
      expect(result.failureReason).toContain('signature verification failed');
    });

    it('rejects stale webhook exceeding 5-minute replay window', async () => {
      const signature = createHmac('sha256', secret).update(payload).digest('hex');
      const staleUnix = Math.floor(Date.now() / 1000) - 400; // 400s ago (> 300s)

      const result = await adapter.verifyWebhookSignature(
        payload,
        {
          'x-ebay-signature': signature,
          'x-ebay-timestamp': String(staleUnix),
        },
        secret,
      );

      expect(result.isValid).toBe(false);
      expect(result.isReplay).toBe(true);
      expect(result.failureReason).toContain('outside acceptable 5-minute replay window');
    });

    it('transforms inbound webhook payload into internal canonical command with deterministic syncHash', () => {
      const parsed = JSON.parse(payload);
      const command = adapter.transformInboundWebhook(parsed, {}, 'corr-wb-1');

      expect(command.eventType).toBe('MARKETPLACE_ACCOUNT_DELETION');
      expect(command.externalId).toBe('notif-101');
      expect(command.entityType).toBe('CUSTOMER');
      expect(command.syncHash).toBeDefined();
      expect(command.correlationId).toBe('corr-wb-1');
    });
  });
});

