import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { TradeMeAdapter, TradeMeListingPayload } from './trademe.adapter';

describe('TradeMeAdapter', () => {
  let adapter: TradeMeAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeMeAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'TRADEME_CONSUMER_KEY') return 'test_tm_consumer_key_1234';
              if (key === 'TRADEME_CONSUMER_SECRET') return 'test_tm_consumer_secret_5678';
              if (key === 'TRADEME_OAUTH_TOKEN') return 'test_tm_oauth_token_9012';
              if (key === 'TRADEME_OAUTH_TOKEN_SECRET') return 'test_tm_oauth_token_secret_3456';
              if (key === 'TRADEME_ENVIRONMENT') return 'sandbox';
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<TradeMeAdapter>(TradeMeAdapter);
  });

  describe('Capabilities & Definition', () => {
    it('declares correct providerKey and marketplace capabilities', () => {
      expect(adapter.providerKey).toBe('TRADE_ME');
      expect(adapter.isMock).toBe(false);
      expect(adapter.capabilities).toContain('CATALOG_PUBLISH');
      expect(adapter.capabilities).toContain('INVENTORY_SYNC_OUTBOUND');
      expect(adapter.capabilities).toContain('ORDERS_IMPORT');
      expect(adapter.capabilities).toContain('ORDERS_STATUS_UPDATE');
      expect(adapter.capabilities).toContain('WEBHOOK_INGESTION');
    });
  });

  describe('Credential Validation', () => {
    it('validates present and complete OAuth 1.0a 4-part key set', async () => {
      const valid = await adapter.validateCredentials({
        consumerKey: 'consumer_key_12345',
        consumerSecret: 'consumer_secret_67890',
        oauthToken: 'oauth_token_abcde',
        oauthTokenSecret: 'oauth_token_secret_fghij',
      });
      expect(valid).toBe(true);
    });

    it('rejects incomplete or null credentials', async () => {
      const totallyMissing = await adapter.validateCredentials(null as any);
      expect(totallyMissing).toBe(false);

      const missingToken = await adapter.validateCredentials({
        consumerKey: 'key_12345678',
        consumerSecret: 'secret_12345678',
        oauthToken: '',
        oauthTokenSecret: '',
      });
      expect(missingToken).toBe(false);
    });
  });

  describe('Pre-Publication Listing Validation', () => {
    const validMotorsListing: TradeMeListingPayload = {
      sku: 'TYR-BRI-2055516-EP300',
      title: 'Bridgestone Ecopia EP300 205/55R16 91V Low Rolling Resistance Tyre',
      description: 'Brand new premium passenger tyre. Compliant with NZ WOF road standards.',
      price: 185.0, // NZD, 15% GST inclusive
      quantity: 8,
      categoryId: '0001-0268-0270-', // Car parts & accessories
      isMotorsCategory: true,
      isBrandNew: true,
      pickupOption: 1, // Allow pickup from Penrose trade counter
      shippingOptions: [
        { type: 3, price: 25.0, method: 'CourierPost Nationwide' },
        { type: 3, price: 45.0, method: 'Mainfreight Express' },
      ],
    };

    it('approves a valid Trade Me Motors listing payload', () => {
      const result = adapter.validateListingPayload(validMotorsListing);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('enforces 80-character title limit for Motors categories', () => {
      const longTitle = 'M'.repeat(81);
      const result = adapter.validateListingPayload({
        ...validMotorsListing,
        title: longTitle,
        isMotorsCategory: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Listing Title exceeds Trade Me maximum limit of 80 characters');
      expect(result.errors[0]).toContain('81 characters');
    });

    it('enforces 50-character title limit for General categories', () => {
      const generalTitle = 'G'.repeat(51);
      const result = adapter.validateListingPayload({
        ...validMotorsListing,
        title: generalTitle,
        isMotorsCategory: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Listing Title exceeds Trade Me maximum limit of 50 characters');
    });

    it('rejects empty title, SKU, or description', () => {
      const result = adapter.validateListingPayload({
        ...validMotorsListing,
        sku: '',
        title: '',
        description: '',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('SKU is required'))).toBe(true);
      expect(result.errors.some((e) => e.includes('Listing Title is required'))).toBe(true);
      expect(result.errors.some((e) => e.includes('Listing Description is required'))).toBe(true);
    });

    it('rejects non-positive BuyNowPrice and negative quantity', () => {
      const result = adapter.validateListingPayload({
        ...validMotorsListing,
        price: 0,
        quantity: -1,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Buy Now Price must be a positive number'))).toBe(true);
      expect(result.errors.some((e) => e.includes('quantity must be a non-negative integer'))).toBe(true);
    });

    it('rejects listings with neither shipping options nor depot pickup enabled', () => {
      const result = adapter.validateListingPayload({
        ...validMotorsListing,
        pickupOption: 3, // 3 = No pickup
        shippingOptions: [], // Empty shipping
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('requires at least one shipping option or depot pickup enabled'))).toBe(true);
    });
  });

  describe('OAuth 1.0a Signature & Header Generation', () => {
    it('generates compliant OAuth 1.0a Authorization header with HMAC-SHA1 signature', () => {
      const header = adapter.generateOAuth1Header(
        'https://api.tmsandbox.co.nz/v1/Selling.json',
        'POST',
        {
          consumerKey: 'consumer_key_123',
          consumerSecret: 'consumer_secret_456',
          oauthToken: 'oauth_token_789',
          oauthTokenSecret: 'oauth_token_secret_012',
        },
      );

      expect(header).toMatch(/^OAuth /);
      expect(header).toContain('oauth_consumer_key="consumer_key_123"');
      expect(header).toContain('oauth_token="oauth_token_789"');
      expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
      expect(header).toContain('oauth_timestamp=');
      expect(header).toContain('oauth_nonce=');
      expect(header).toContain('oauth_signature=');
    });
  });

  describe('Listing Publication (CATALOG_PUBLISH)', () => {
    beforeEach(() => {
      adapter.setSimulationMode(true);
    });

    it('publishes listing and returns confirmed ListingId and Active status', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-tm-pub-1',
        jobType: 'CATALOG_PUBLISH',
        direction: 'OUTBOUND',
        correlationId: 'corr-tm-pub-1',
        payload: {
          sku: 'TYR-BRI-2055516-EP300',
          title: 'Bridgestone Ecopia EP300 205/55R16 Tyre',
          description: 'High fuel efficiency tyre in Auckland depot',
          price: 185.0,
          quantity: 4,
          categoryId: '0001-0268-0270-',
          isMotorsCategory: true,
          pickupOption: 1,
          shippingOptions: [{ type: 3, price: 25.0, method: 'CourierPost' }],
        },
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toMatch(/^TM-/);
      expect(result.syncHash).toBeDefined();
      expect(result.data?.['status']).toBe('Active');
      expect(result.data?.['isInTrade']).toBe(true);
      expect(result.data?.['currency']).toBe('NZD');
    });

    it('aborts early and returns actionable error when listing validation fails', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-tm-pub-bad',
        jobType: 'CATALOG_PUBLISH',
        direction: 'OUTBOUND',
        correlationId: 'corr-tm-pub-bad',
        payload: {
          sku: 'TYR-BAD-01',
          title: 'T'.repeat(90), // Exceeds 80 chars
          description: 'Desc',
          price: -20,
          quantity: 1,
          categoryId: '0001-0268-',
          isMotorsCategory: true,
        },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(false);
      expect(result.error).toContain('Trade Me Listing Validation Failed');
      expect(result.error).toContain('Listing Title exceeds Trade Me maximum limit of 80 characters');
      expect(result.error).toContain('Buy Now Price must be a positive number');
    });
  });

  describe('Listing Update & Withdrawal', () => {
    beforeEach(() => {
      adapter.setSimulationMode(true);
    });

    it('updates existing listing price and quantity with ListingId', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-tm-edit-1',
        jobType: 'LISTING_UPDATE',
        direction: 'OUTBOUND',
        correlationId: 'corr-tm-edit-1',
        payload: {
          listingId: 1049281,
          price: 195.0,
          quantity: 6,
        },
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('1049281');
      expect(result.data?.['status']).toBe('Active');
    });

    it('rejects listing update if ListingId is missing', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-tm-edit-bad',
        jobType: 'LISTING_UPDATE',
        direction: 'OUTBOUND',
        correlationId: 'corr-tm-edit-bad',
        payload: { price: 195.0 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires an external ListingId');
    });

    it('withdraws active listing and marks status Withdrawn', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-tm-with-1',
        jobType: 'LISTING_WITHDRAW',
        direction: 'OUTBOUND',
        correlationId: 'corr-tm-with-1',
        payload: { listingId: 1049281 },
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('1049281');
      expect(result.data?.['status']).toBe('Withdrawn');
    });
  });

  describe('Inventory Stock Synchronization (INVENTORY_SYNC_OUTBOUND)', () => {
    beforeEach(() => {
      adapter.setSimulationMode(true);
    });

    it('synchronizes updated stock quantity for Trade Me SKU', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-tm-inv-1',
        jobType: 'INVENTORY_SYNC_OUTBOUND',
        direction: 'OUTBOUND',
        correlationId: 'corr-tm-inv-1',
        payload: {
          sku: 'TYR-BRI-2055516-EP300',
          listingId: 1049281,
          quantity: 12,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.['syncedQuantity']).toBe(12);
      expect(result.data?.['status']).toBe('Active');
    });

    it('rejects stock sync with negative quantity or missing SKU', async () => {
      const badQty = await adapter.executeSync({
        jobId: 'job-tm-inv-bad',
        jobType: 'INVENTORY_SYNC_OUTBOUND',
        direction: 'OUTBOUND',
        correlationId: 'corr-tm-inv-bad',
        payload: { sku: 'TYR-01', quantity: -3 },
      });

      expect(badQty.success).toBe(false);
      expect(badQty.error).toContain('must be non-negative');
    });
  });

  describe('Order Import & Normalization (ORDERS_IMPORT)', () => {
    beforeEach(() => {
      adapter.setSimulationMode(true);
    });

    it('fetches sold orders and normalizes into internal canonical schema with NZ address and NZD currency', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-tm-orders-1',
        jobType: 'ORDERS_IMPORT',
        direction: 'INBOUND',
        correlationId: 'corr-tm-orders-1',
      });

      expect(result.success).toBe(true);
      const orders = result.data?.['orders'] as any[];
      expect(orders).toBeDefined();
      expect(orders.length).toBeGreaterThan(0);

      const order = orders[0];
      expect(order.externalOrderId).toMatch(/^TM-PUR-/);
      expect(order.orderSource).toBe('TRADE_ME_MARKETPLACE');
      expect(order.currency).toBe('NZD');
      expect(order.paymentStatus).toBe('PAID');
      expect(order.shippingAddress.city).toBe('Auckland');
      expect(order.shippingAddress.country).toBe('NZ');
      expect(order.items[0].sku).toBe('TYR-MICH-2254517-PS5');
    });
  });

  describe('Fulfillment Dispatch Tracking (ORDERS_STATUS_UPDATE)', () => {
    beforeEach(() => {
      adapter.setSimulationMode(true);
    });

    it('dispatches CourierPost tracking details to Trade Me order', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-tm-fulfill-1',
        jobType: 'ORDERS_STATUS_UPDATE',
        direction: 'OUTBOUND',
        correlationId: 'corr-tm-fulfill-1',
        payload: {
          orderId: 'TM-PUR-882194',
          carrierName: 'CourierPost',
          trackingNumber: 'NZP-998822',
        },
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toMatch(/^TM-DISPATCH-/);
      expect(result.data?.['carrierName']).toBe('CourierPost');
      expect(result.data?.['trackingNumber']).toBe('NZP-998822');
      expect(result.data?.['status']).toBe('DISPATCHED');
    });

    it('rejects fulfillment update without tracking number', async () => {
      const result = await adapter.executeSync({
        jobId: 'job-tm-fulfill-bad',
        jobType: 'ORDERS_STATUS_UPDATE',
        direction: 'OUTBOUND',
        correlationId: 'corr-tm-fulfill-bad',
        payload: { orderId: 'TM-PUR-882194' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires a shipment tracking number');
    });
  });

  describe('Rate Limiting & Transient/Permanent Error Classification', () => {
    it('classifies HTTP 429 rate limit as transient failure for automatic retry', async () => {
      adapter.setSimulationMode(true);
      adapter.setSimulatedRateLimitFailure(true);

      const result = await adapter.executeSync({
        jobId: 'job-tm-rate-1',
        jobType: 'INVENTORY_SYNC_OUTBOUND',
        direction: 'OUTBOUND',
        correlationId: 'corr-tm-rate-1',
        payload: { sku: 'TYR-01', quantity: 4 },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(true);
      expect(result.error).toContain('HTTP 429 Too Many Requests');
    });

    it('classifies HTTP 504 gateway timeout as transient failure', async () => {
      adapter.setSimulationMode(true);
      adapter.setSimulatedTransientFailure(true);

      const result = await adapter.executeSync({
        jobId: 'job-tm-504-1',
        jobType: 'ORDERS_STATUS_UPDATE',
        direction: 'OUTBOUND',
        correlationId: 'corr-tm-504-1',
        payload: { orderId: '101', trackingNumber: 'NZP-123' },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(true);
      expect(result.error).toContain('HTTP 504');
    });

    it('classifies permanent permission/auth failure as non-transient for manual admin review', async () => {
      adapter.setSimulationMode(true);
      adapter.setSimulatedPermanentFailure(true);

      const result = await adapter.executeSync({
        jobId: 'job-tm-perm-1',
        jobType: 'CATALOG_PUBLISH',
        direction: 'OUTBOUND',
        correlationId: 'corr-tm-perm-1',
        payload: { sku: 'TYR-01' },
      });

      expect(result.success).toBe(false);
      expect(result.isTransient).toBe(false); // Must be false so it moves to dead-letter / manual review
      expect(result.error).toContain('Trade Me In-Trade Permission Error');
    });
  });

  describe('Webhook & Signature Verification', () => {
    const secret = 'trademe_webhook_signing_secret_2026';
    const payload = JSON.stringify({
      PurchaseId: 'TM-PUR-998811',
      EventType: 'ListingSold',
      ListingId: 1049281,
      SoldPrice: 320.0,
      SoldDate: new Date().toISOString(),
    });

    it('verifies valid HMAC-SHA256 signature and fresh timestamp', async () => {
      const signature = createHmac('sha256', secret).update(payload).digest('hex');
      const currentUnix = Math.floor(Date.now() / 1000);

      const result = await adapter.verifyWebhookSignature(
        payload,
        {
          'x-trademe-signature': signature,
          'x-trademe-timestamp': String(currentUnix),
        },
        secret,
      );

      expect(result.isValid).toBe(true);
    });

    it('rejects invalid signature', async () => {
      const currentUnix = Math.floor(Date.now() / 1000);
      const result = await adapter.verifyWebhookSignature(
        payload,
        {
          'x-trademe-signature': 'tampered_signature_xyz',
          'x-trademe-timestamp': String(currentUnix),
        },
        secret,
      );

      expect(result.isValid).toBe(false);
      expect(result.failureReason).toContain('signature mismatch');
    });

    it('rejects stale webhook exceeding 5-minute replay window', async () => {
      const signature = createHmac('sha256', secret).update(payload).digest('hex');
      const staleUnix = Math.floor(Date.now() / 1000) - 350;

      const result = await adapter.verifyWebhookSignature(
        payload,
        {
          'x-trademe-signature': signature,
          'x-trademe-timestamp': String(staleUnix),
        },
        secret,
      );

      expect(result.isValid).toBe(false);
      expect(result.isReplay).toBe(true);
      expect(result.failureReason).toContain('outside acceptable 5-minute replay window');
    });

    it('transforms inbound webhook into internal command with deterministic syncHash', () => {
      const parsed = JSON.parse(payload);
      const command = adapter.transformInboundWebhook(parsed, {}, 'corr-tm-wb-1');

      expect(command.eventType).toBe('ListingSold');
      expect(command.externalId).toBe('TM-PUR-998811');
      expect(command.entityType).toBe('ORDER');
      expect(command.syncHash).toBeDefined();
      expect(command.correlationId).toBe('corr-tm-wb-1');
    });
  });
});

