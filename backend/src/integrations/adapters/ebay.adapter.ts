import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';
import {
  IntegrationProviderAdapter,
  InternalIntegrationCommand,
  SyncJobExecutionInput,
  SyncJobExecutionResult,
  WebhookVerificationResult,
} from '../core/integration-adapter.interface';
import { IntegrationCapability } from '@pinnacle/contracts';

/**
 * =============================================================================
 * EBAY INTEGRATION ADAPTER — FIELD MAPPING & OWNERSHIP SPECIFICATION
 * =============================================================================
 *
 * 1. SKU:
 *    - Authoritative Owner: Pinnacle Internal Catalog
 *    - eBay Mapping: sell/inventory/v1/inventory_item/{sku}
 *    - Rule: Internal SKU is primary key on eBay inventory items. Max 50 chars.
 *
 * 2. External Listing ID & Offer ID:
 *    - Authoritative Owner: eBay Marketplace
 *    - Internal Mapping: ExternalIdMapping (entityType: 'LISTING')
 *    - Rule: Created upon offer creation & publish. Stored for tracking and updates.
 *
 * 3. Price & Currency:
 *    - Authoritative Owner: Pinnacle
 *    - eBay Mapping: pricingSummary.price.value (formatted to 2 decimals)
 *    - Currency: pricingSummary.price.currency (NZD or AUD)
 *
 * 4. Inventory Quantity:
 *    - Authoritative Owner: Pinnacle Warehouse Inventory
 *    - eBay Mapping: availability.shipToLocationAvailability.quantity
 *    - Rule: Non-negative integer. Sync pushed on stock changes.
 *
 * 5. Listing Status:
 *    - Authoritative Owner: Shared / State Machine
 *    - Mapping:
 *      * Pinnacle PUBLISHED  <-> eBay PUBLISHED
 *      * Pinnacle DRAFT      <-> eBay UNPUBLISHED
 *      * Pinnacle ARCHIVED   <-> eBay ENDED
 *
 * 6. Orders:
 *    - Authoritative Owner: eBay (buyer payment, order lifecycle)
 *    - Internal Mapping: ExternalIdMapping (entityType: 'ORDER', externalId: orderId)
 *    - Rule: Inbound orders converted to internal DTOs. Duplicate imports suppressed.
 *
 * 7. Fulfilment & Tracking:
 *    - Authoritative Owner: Pinnacle Dispatch Operations
 *    - eBay Mapping: sell/fulfillment/v1/order/{orderId}/shipping_fulfillment
 *    - Rule: Carrier name (CourierPost, Mainfreight, NZ Post) and tracking number.
 * =============================================================================
 */

export interface EbayListingValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface EbayListingPayload {
  sku: string;
  title: string;
  description: string;
  price: number;
  currency?: string;
  quantity: number;
  categoryId: string;
  condition: string;
  imageUrls: string[];
  brand?: string;
  mpn?: string;
  aspects?: Record<string, string[]>;
  offerId?: string;
  listingPolicies?: {
    fulfillmentPolicyId?: string;
    paymentPolicyId?: string;
    returnPolicyId?: string;
  };
}

export interface EbayFulfillmentPayload {
  orderId: string;
  carrierName: string;
  trackingNumber: string;
  lineItemIds?: string[];
  shippedDate?: string;
}

export interface EbayOAuthToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number; // Unix timestamp in ms
}

export const EBAY_VALID_CONDITIONS = [
  'NEW',
  'LIKE_NEW',
  'USED_EXCELLENT',
  'USED_VERY_GOOD',
  'USED_GOOD',
  'FOR_PARTS_OR_NOT_WORKING',
  'REMANUFACTURED',
] as const;

export type EbayCondition = (typeof EBAY_VALID_CONDITIONS)[number];

@Injectable()
export class EbayAdapter implements IntegrationProviderAdapter {
  readonly providerKey = 'EBAY';
  readonly displayName = 'eBay Marketplace (Motors Spares & Accessories)';
  readonly isMock = false;

  readonly capabilities: IntegrationCapability[] = [
    'CATALOG_PUBLISH',
    'INVENTORY_SYNC_OUTBOUND',
    'ORDERS_IMPORT',
    'ORDERS_STATUS_UPDATE',
    'WEBHOOK_INGESTION',
  ];

  private readonly logger = new Logger(EbayAdapter.name);

  // Rate Limiting Tracker (Sliding window: default 60 req/min)
  private readonly requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly TIMEOUT_MS = 8000;
  private readonly MAX_RETRIES = 2;

  // Cached OAuth User Access Token
  private cachedToken: EbayOAuthToken | null = null;

  // Simulation mode for deterministic automated testing and sandbox environments
  private simulationMode = false;
  private simulatedTransientFailure = false;
  private simulatedRateLimitFailure = false;

  constructor(private readonly config: ConfigService) {}

  /**
   * Set simulation mode for automated testing without live network calls.
   */
  setSimulationMode(enabled: boolean) {
    this.simulationMode = enabled;
  }

  setSimulatedTransientFailure(enabled: boolean) {
    this.simulatedTransientFailure = enabled;
  }

  setSimulatedRateLimitFailure(enabled: boolean) {
    this.simulatedRateLimitFailure = enabled;
  }

  // ---------------------------------------------------------------------------
  // 1. Credentials Validation
  // ---------------------------------------------------------------------------

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    if (!credentials) return false;

    const clientId =
      credentials['clientId'] ||
      credentials['client_id'] ||
      credentials['apiKey'] ||
      this.config.get<string>('EBAY_CLIENT_ID');

    const clientSecret =
      credentials['clientSecret'] ||
      credentials['client_secret'] ||
      credentials['apiSecret'] ||
      this.config.get<string>('EBAY_CLIENT_SECRET');

    // eBay OAuth 2.0 requires at minimum Client ID and Client Secret
    return Boolean(
      clientId &&
        clientId.trim().length >= 8 &&
        clientSecret &&
        clientSecret.trim().length >= 8,
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Listing Pre-Publication Validation
  // ---------------------------------------------------------------------------

  /**
   * Validates all listing requirements before dispatching to eBay APIs.
   * Enforces official eBay title length, price, condition, category, and image constraints.
   */
  validateListingPayload(payload: EbayListingPayload): EbayListingValidationResult {
    const errors: string[] = [];

    // 1. SKU validation
    if (!payload.sku || typeof payload.sku !== 'string' || payload.sku.trim().length === 0) {
      errors.push('SKU is required and cannot be empty.');
    } else if (payload.sku.length > 50) {
      errors.push(`SKU exceeds maximum allowed length of 50 characters (got ${payload.sku.length}).`);
    }

    // 2. Title validation (Hard eBay constraint: 1 to 80 characters)
    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0) {
      errors.push('Listing Title is required and cannot be empty.');
    } else if (payload.title.trim().length > 80) {
      errors.push(
        `Listing Title exceeds eBay maximum limit of 80 characters (got ${payload.title.trim().length} characters). Please shorten the title.`,
      );
    }

    // 3. Price validation
    if (typeof payload.price !== 'number' || isNaN(payload.price) || payload.price <= 0) {
      errors.push(`Listing Price must be a positive number greater than 0.00 (got "${payload.price}").`);
    }

    // 4. Quantity validation
    if (typeof payload.quantity !== 'number' || isNaN(payload.quantity) || payload.quantity < 0) {
      errors.push(`Available inventory quantity must be a non-negative integer (got "${payload.quantity}").`);
    }

    // 5. Category ID validation
    if (!payload.categoryId || typeof payload.categoryId !== 'string' || payload.categoryId.trim().length === 0) {
      errors.push('Primary eBay Category ID is required for automotive parts publication.');
    }

    // 6. Image URLs validation (eBay requires at least 1 image)
    if (!Array.isArray(payload.imageUrls) || payload.imageUrls.length === 0) {
      errors.push('At least one valid image URL is required for eBay listing publication.');
    } else {
      const validImages = payload.imageUrls.filter(
        (url) => typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://')),
      );
      if (validImages.length === 0) {
        errors.push('At least one image URL must be an absolute HTTP/HTTPS URL.');
      }
    }

    // 7. Condition validation
    if (!payload.condition || typeof payload.condition !== 'string') {
      errors.push('Item Condition is required.');
    } else {
      const normalizedCond = this.normalizeCondition(payload.condition);
      if (!normalizedCond || !EBAY_VALID_CONDITIONS.includes(normalizedCond as EbayCondition)) {
        errors.push(
          `Invalid eBay condition "${payload.condition}". Expected one of: ${EBAY_VALID_CONDITIONS.join(', ')}.`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. OAuth 2.0 Credential Handling & Token Caching
  // ---------------------------------------------------------------------------

  /**
   * Retrieves an active OAuth 2.0 access token.
   * Utilizes in-memory token caching with automatic refresh when within 5 minutes of expiration.
   */
  async getOAuthAccessToken(
    credentials?: Record<string, string>,
    correlationId = 'ebay-oauth',
  ): Promise<string> {
    const now = Date.now();

    // Check cached token (refresh 5 minutes before expiry)
    if (this.cachedToken && this.cachedToken.expiresAt - now > 300_000) {
      return this.cachedToken.accessToken;
    }

    // If simulation mode is active, return a simulated valid OAuth token
    if (this.simulationMode) {
      const simulatedToken = `simulated_ebay_oauth_token_${Date.now()}`;
      this.cachedToken = {
        accessToken: simulatedToken,
        tokenType: 'User Access Token',
        expiresAt: now + 7200 * 1000,
      };
      return simulatedToken;
    }

    const clientId =
      credentials?.['clientId'] ||
      credentials?.['client_id'] ||
      credentials?.['apiKey'] ||
      this.config.get<string>('EBAY_CLIENT_ID');

    const clientSecret =
      credentials?.['clientSecret'] ||
      credentials?.['client_secret'] ||
      credentials?.['apiSecret'] ||
      this.config.get<string>('EBAY_CLIENT_SECRET');

    const refreshToken =
      credentials?.['refreshToken'] ||
      credentials?.['refresh_token'] ||
      this.config.get<string>('EBAY_REFRESH_TOKEN');

    const environment =
      credentials?.['environment'] ||
      this.config.get<string>('EBAY_ENVIRONMENT') ||
      'sandbox';

    if (!clientId || !clientSecret) {
      throw new Error(
        'eBay live API call blocked: Required OAuth credentials (EBAY_CLIENT_ID / EBAY_CLIENT_SECRET) are not configured. Configure credentials in Integration Settings.',
      );
    }

    const tokenEndpoint =
      environment === 'production'
        ? 'https://api.ebay.com/identity/v1/oauth2/token'
        : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';

    const basicAuth = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');

    // Build URL-encoded request body
    const bodyParams = new URLSearchParams();
    if (refreshToken && refreshToken.trim().length > 10) {
      bodyParams.append('grant_type', 'refresh_token');
      bodyParams.append('refresh_token', refreshToken.trim());
      bodyParams.append(
        'scope',
        'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment',
      );
    } else {
      bodyParams.append('grant_type', 'client_credentials');
      bodyParams.append('scope', 'https://api.ebay.com/oauth/api_scope');
    }

    const response = await this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      try {
        const res = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: bodyParams.toString(),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`eBay OAuth token request failed (HTTP ${res.status}): ${errText}`);
        }

        return await res.json();
      } finally {
        clearTimeout(timer);
      }
    }, correlationId);

    const tokenData = response as {
      access_token: string;
      expires_in: number;
      token_type?: string;
    };

    if (!tokenData.access_token) {
      throw new Error('eBay OAuth token response did not include access_token.');
    }

    this.cachedToken = {
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type || 'User Access Token',
      expiresAt: now + (tokenData.expires_in || 7200) * 1000,
    };

    this.logger.log(`[eBay] [${correlationId}] Successfully acquired OAuth 2.0 access token.`);
    return this.cachedToken.accessToken;
  }

  // ---------------------------------------------------------------------------
  // 4. Webhook & Notification Verification
  // ---------------------------------------------------------------------------

  async verifyWebhookSignature(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string,
  ): Promise<WebhookVerificationResult> {
    const rawSignature = headers['x-ebay-signature'] || headers['x-signature'];
    const signature = Array.isArray(rawSignature) ? rawSignature[0] : rawSignature;

    const rawTimestamp = headers['x-ebay-timestamp'] || headers['x-timestamp'];
    const timestampStr = Array.isArray(rawTimestamp) ? rawTimestamp[0] : rawTimestamp;

    // Handle eBay endpoint verification challenge
    const rawBody = typeof payload === 'string' ? payload : payload.toString('utf8');
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed.challengeCode) {
        return {
          isValid: true,
          timestamp: Math.floor(Date.now() / 1000),
        };
      }
    } catch {
      // Not JSON challenge, continue with signature check
    }

    if (!signature) {
      return {
        isValid: false,
        failureReason: 'Missing X-EBAY-SIGNATURE header in webhook request.',
      };
    }

    // Check timestamp freshness if provided
    let timestamp = Math.floor(Date.now() / 1000);
    if (timestampStr) {
      const parsedTs = parseInt(timestampStr, 10);
      if (!isNaN(parsedTs)) {
        timestamp = parsedTs;
        const currentUnix = Math.floor(Date.now() / 1000);
        if (Math.abs(currentUnix - timestamp) > 300) {
          return {
            isValid: false,
            isReplay: true,
            timestamp,
            failureReason: `Webhook timestamp outside acceptable 5-minute replay window (drift: ${Math.abs(currentUnix - timestamp)}s).`,
          };
        }
      }
    }

    // Verify HMAC-SHA256 signature against secret if secret is configured
    if (secret) {
      const expectedHmac = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      const expectedBase64 = createHmac('sha256', secret)
        .update(rawBody)
        .digest('base64');

      if (signature !== expectedHmac && signature !== expectedBase64) {
        return {
          isValid: false,
          failureReason: 'Cryptographic HMAC signature verification failed against configured webhook secret.',
        };
      }
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
    const eventType =
      rawPayload.metadata?.topic ||
      rawPayload.notificationType ||
      rawPayload.eventType ||
      'EBAY_ORDER_NOTIFICATION';

    const externalId =
      rawPayload.notificationId ||
      rawPayload.orderId ||
      rawPayload.listingId ||
      `ebay_event_${Date.now()}`;

    const entityType = this.resolveWebhookEntityType(eventType);

    const syncHash = createHash('sha256')
      .update(JSON.stringify(rawPayload.data || rawPayload))
      .digest('hex');

    return {
      eventType,
      externalId: String(externalId),
      entityType,
      correlationId,
      payload: rawPayload.data || rawPayload,
      syncHash,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Sync Job Execution Dispatcher
  // ---------------------------------------------------------------------------

  async executeSync(input: SyncJobExecutionInput): Promise<SyncJobExecutionResult> {
    const correlationId = input.correlationId || `ebay-sync-${Date.now()}`;

    // Handle simulated test failure flags
    if (this.simulatedRateLimitFailure) {
      return {
        success: false,
        isTransient: true,
        error: 'eBay API Rate Limit Exceeded: HTTP 429 Too Many Requests (Simulated Backoff Trigger)',
      };
    }

    if (this.simulatedTransientFailure) {
      return {
        success: false,
        isTransient: true,
        error: 'eBay API Gateway Timeout: HTTP 504 (Simulated Transient Failure)',
      };
    }

    try {
      this.enforceRateLimit();

      switch (input.jobType) {
        case 'CATALOG_PUBLISH':
        case 'LISTING_CREATE':
        case 'LISTING_UPDATE':
          return await this.executeCatalogPublish(input, correlationId);

        case 'INVENTORY_SYNC_OUTBOUND':
        case 'INVENTORY_UPDATE':
          return await this.executeInventorySync(input, correlationId);

        case 'ORDERS_IMPORT':
          return await this.executeOrderImport(input, correlationId);

        case 'ORDERS_STATUS_UPDATE':
        case 'FULFILLMENT_UPDATE':
          return await this.executeFulfillmentUpdate(input, correlationId);

        default:
          return {
            success: true,
            data: {
              message: `eBay adapter received unhandled jobType "${input.jobType}". Acknowledged without action.`,
            },
          };
      }
    } catch (err) {
      const errorMsg = (err as Error).message || 'Unknown eBay sync error';
      const isTransient = this.isTransientError(err);

      this.logger.error(`[eBay] [${correlationId}] Sync job failed: ${errorMsg}`, (err as Error).stack);

      return {
        success: false,
        isTransient,
        error: errorMsg,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Capability Handlers
  // ---------------------------------------------------------------------------

  /**
   * Publication & Update Flow (Sell Inventory API):
   * 1. Pre-publication validation of title, price, images, condition.
   * 2. PUT /sell/inventory/v1/inventory_item/{sku}
   * 3. POST /sell/inventory/v1/offer (or PUT if offer exists)
   * 4. POST /sell/inventory/v1/offer/{offerId}/publish
   */
  private async executeCatalogPublish(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const rawPayload = (input.payload || {}) as unknown as EbayListingPayload;

    // 1. Pre-publication Validation
    const validation = this.validateListingPayload(rawPayload);
    if (!validation.isValid) {
      this.logger.warn(
        `[eBay] [${correlationId}] Pre-publication validation failed for SKU "${rawPayload.sku}": ${validation.errors.join('; ')}`,
      );
      return {
        success: false,
        isTransient: false, // Schema/data errors are non-transient; require user correction
        error: `eBay Listing Validation Failed: ${validation.errors.join(' | ')}`,
      };
    }

    const sku = rawPayload.sku.trim();
    const condition = this.normalizeCondition(rawPayload.condition) || 'USED_EXCELLENT';
    const marketplaceId = (input.settings?.['marketplaceId'] as string) || 'EBAY_AU';
    const currency = rawPayload.currency || 'NZD';

    // 2. In simulation mode or sandbox test, simulate realistic successful publish
    if (this.simulationMode) {
      const simulatedListingId = `ebay-listing-${Date.now()}`;
      const simulatedOfferId = `ebay-offer-${Date.now()}`;
      const syncHash = createHash('sha256')
        .update(JSON.stringify({ sku, price: rawPayload.price, quantity: rawPayload.quantity, simulatedListingId }))
        .digest('hex');

      return {
        success: true,
        externalId: simulatedListingId,
        syncHash,
        data: {
          sku,
          listingId: simulatedListingId,
          offerId: simulatedOfferId,
          marketplaceId,
          currency,
          price: rawPayload.price,
          quantity: rawPayload.quantity,
          status: 'PUBLISHED',
          publishedAt: new Date().toISOString(),
          attribution: 'eBay Sell Inventory API v1 (Simulated)',
        },
      };
    }

    // 3. Live API Publication Call
    const token = await this.getOAuthAccessToken(input.credentials, correlationId);
    const environment = (input.settings?.['environment'] as string) || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.ebay.com/sell/inventory/v1'
        : 'https://api.sandbox.ebay.com/sell/inventory/v1';

    // Step A: PUT inventory_item
    const inventoryItemBody = {
      availability: {
        shipToLocationAvailability: {
          quantity: rawPayload.quantity,
        },
      },
      condition,
      product: {
        title: rawPayload.title.trim().slice(0, 80),
        description: rawPayload.description || rawPayload.title,
        aspects: {
          ...(rawPayload.brand ? { Brand: [rawPayload.brand] } : {}),
          ...(rawPayload.mpn ? { 'Manufacturer Part Number': [rawPayload.mpn] } : {}),
          ...(rawPayload.aspects || {}),
        },
        imageUrls: rawPayload.imageUrls,
      },
    };

    await this.callEbayApi(
      `${baseUrl}/inventory_item/${encodeURIComponent(sku)}`,
      'PUT',
      token,
      inventoryItemBody,
      correlationId,
    );

    // Step B: Create or Update Offer
    const offerBody = {
      sku,
      marketplaceId,
      format: 'FIXED_PRICE',
      pricingSummary: {
        price: {
          value: rawPayload.price.toFixed(2),
          currency,
        },
      },
      listingPolicies: rawPayload.listingPolicies || {},
      categoryId: rawPayload.categoryId,
    };

    let offerId = rawPayload.offerId;
    if (!offerId) {
      const offerRes = (await this.callEbayApi(
        `${baseUrl}/offer`,
        'POST',
        token,
        offerBody,
        correlationId,
      )) as { offerId: string };
      offerId = offerRes.offerId;
    } else {
      await this.callEbayApi(
        `${baseUrl}/offer/${encodeURIComponent(offerId)}`,
        'PUT',
        token,
        offerBody,
        correlationId,
      );
    }

    // Step C: Publish Offer
    const publishRes = (await this.callEbayApi(
      `${baseUrl}/offer/${encodeURIComponent(offerId)}/publish`,
      'POST',
      token,
      undefined,
      correlationId,
    )) as { listingId: string };

    const listingId = publishRes.listingId || `offer-${offerId}`;
    const syncHash = createHash('sha256')
      .update(JSON.stringify({ sku, price: rawPayload.price, quantity: rawPayload.quantity, listingId }))
      .digest('hex');

    return {
      success: true,
      externalId: listingId,
      syncHash,
      data: {
        sku,
        listingId,
        offerId,
        status: 'PUBLISHED',
        publishedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Fast Inventory Stock Level Sync:
   * Pushes updated quantity to eBay inventory item.
   */
  private async executeInventorySync(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const payload = input.payload || {};
    const sku = (payload['sku'] as string)?.trim();
    const quantity = Number(payload['quantity']);

    if (!sku) {
      return {
        success: false,
        isTransient: false,
        error: 'Inventory sync requires a valid SKU.',
      };
    }

    if (isNaN(quantity) || quantity < 0) {
      return {
        success: false,
        isTransient: false,
        error: `Invalid inventory quantity "${payload['quantity']}". Quantity must be a non-negative number.`,
      };
    }

    const syncHash = createHash('sha256')
      .update(JSON.stringify({ sku, quantity }))
      .digest('hex');

    if (this.simulationMode) {
      return {
        success: true,
        externalId: sku,
        syncHash,
        data: {
          sku,
          syncedQuantity: quantity,
          timestamp: new Date().toISOString(),
          status: quantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
        },
      };
    }

    const token = await this.getOAuthAccessToken(input.credentials, correlationId);
    const environment = (input.settings?.['environment'] as string) || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.ebay.com/sell/inventory/v1'
        : 'https://api.sandbox.ebay.com/sell/inventory/v1';

    // Update availability
    await this.callEbayApi(
      `${baseUrl}/inventory_item/${encodeURIComponent(sku)}`,
      'PUT',
      token,
      {
        availability: {
          shipToLocationAvailability: {
            quantity,
          },
        },
      },
      correlationId,
    );

    return {
      success: true,
      externalId: sku,
      syncHash,
      data: {
        sku,
        syncedQuantity: quantity,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Order Import Flow (Sell Fulfillment API):
   * Queries unfulfilled orders from eBay and normalizes into internal order schema.
   */
  private async executeOrderImport(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    if (this.simulationMode) {
      const mockOrderId = `ebay-ord-${Date.now()}`;
      const mockOrder = {
        orderId: mockOrderId,
        creationDate: new Date().toISOString(),
        orderPaymentStatus: 'PAID',
        orderFulfillmentStatus: 'NOT_STARTED',
        pricingSummary: {
          total: { value: '280.00', currency: 'NZD' },
          priceSubtotal: { value: '255.00', currency: 'NZD' },
          deliveryCost: { value: '25.00', currency: 'NZD' },
        },
        buyer: {
          username: 'nz_mechanic_buyer',
          taxAddress: {
            stateOrProvince: 'Auckland',
            postalCode: '1061',
            countryCode: 'NZ',
          },
        },
        lineItems: [
          {
            lineItemId: 'item-001',
            sku: 'TYR-BRI-2055516-EP300',
            title: 'Bridgestone Ecopia EP300 205/55R16 Tyre',
            quantity: 2,
            lineItemCost: { value: '127.50', currency: 'NZD' },
          },
        ],
      };

      const normalizedOrders = [this.normalizeEbayOrder(mockOrder)];

      return {
        success: true,
        data: {
          importedCount: normalizedOrders.length,
          orders: normalizedOrders,
        },
      };
    }

    const token = await this.getOAuthAccessToken(input.credentials, correlationId);
    const environment = (input.settings?.['environment'] as string) || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.ebay.com/sell/fulfillment/v1'
        : 'https://api.sandbox.ebay.com/sell/fulfillment/v1';

    const ordersRes = (await this.callEbayApi(
      `${baseUrl}/order?filter=orderfulfillmentstatus:%7BNOT_STARTED%7CIN_PROGRESS%7D&limit=50`,
      'GET',
      token,
      undefined,
      correlationId,
    )) as { orders?: any[]; total?: number };

    const rawOrders = ordersRes.orders || [];
    const normalizedOrders = rawOrders.map((o) => this.normalizeEbayOrder(o));

    return {
      success: true,
      data: {
        importedCount: normalizedOrders.length,
        orders: normalizedOrders,
      },
    };
  }

  /**
   * Fulfillment Status Update Flow (Sell Fulfillment API):
   * Dispatches shipment tracking details to eBay.
   */
  private async executeFulfillmentUpdate(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const payload = (input.payload || {}) as unknown as EbayFulfillmentPayload;
    const orderId = payload.orderId?.trim();
    const carrierName = payload.carrierName?.trim() || 'CourierPost';
    const trackingNumber = payload.trackingNumber?.trim();

    if (!orderId) {
      return {
        success: false,
        isTransient: false,
        error: 'Fulfillment update requires external eBay orderId.',
      };
    }

    if (!trackingNumber) {
      return {
        success: false,
        isTransient: false,
        error: 'Fulfillment update requires a valid shipment tracking number.',
      };
    }

    const syncHash = createHash('sha256')
      .update(JSON.stringify({ orderId, carrierName, trackingNumber }))
      .digest('hex');

    if (this.simulationMode) {
      const simulatedFulfillmentId = `fulfill-${Date.now()}`;
      return {
        success: true,
        externalId: simulatedFulfillmentId,
        syncHash,
        data: {
          fulfillmentId: simulatedFulfillmentId,
          orderId,
          carrierName,
          trackingNumber,
          shippedDate: new Date().toISOString(),
          status: 'FULFILLED',
        },
      };
    }

    const token = await this.getOAuthAccessToken(input.credentials, correlationId);
    const environment = (input.settings?.['environment'] as string) || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.ebay.com/sell/fulfillment/v1'
        : 'https://api.sandbox.ebay.com/sell/fulfillment/v1';

    const fulfillmentBody = {
      shippingCarrierCode: this.mapCarrierCode(carrierName),
      trackingNumber,
      shippedDate: payload.shippedDate || new Date().toISOString(),
      ...(payload.lineItemIds ? { lineItems: payload.lineItemIds.map((id) => ({ lineItemId: id })) } : {}),
    };

    const fulfillRes = (await this.callEbayApi(
      `${baseUrl}/order/${encodeURIComponent(orderId)}/shipping_fulfillment`,
      'POST',
      token,
      fulfillmentBody,
      correlationId,
    )) as { fulfillmentId?: string };

    const fulfillmentId = fulfillRes.fulfillmentId || `fulfill-${Date.now()}`;

    return {
      success: true,
      externalId: fulfillmentId,
      syncHash,
      data: {
        fulfillmentId,
        orderId,
        carrierName,
        trackingNumber,
        status: 'FULFILLED',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 7. Internal Helpers & Normalizers
  // ---------------------------------------------------------------------------

  /**
   * Normalizes an external eBay order into canonical internal order structure.
   */
  private normalizeEbayOrder(ebayOrder: any): Record<string, unknown> {
    const pricing = ebayOrder.pricingSummary || {};
    const buyer = ebayOrder.buyer || {};
    const taxAddress = buyer.taxAddress || {};
    const lineItems = ebayOrder.lineItems || [];

    return {
      externalOrderId: ebayOrder.orderId,
      orderSource: 'EBAY_MARKETPLACE',
      orderDate: ebayOrder.creationDate,
      paymentStatus: ebayOrder.orderPaymentStatus === 'PAID' ? 'PAID' : 'PENDING_PAYMENT',
      fulfillmentStatus: ebayOrder.orderFulfillmentStatus === 'FULFILLED' ? 'FULFILLED' : 'UNFULFILLED',
      customerName: buyer.username || 'eBay Customer',
      customerEmail: buyer.email || `${buyer.username || 'customer'}@members.ebay.com`,
      shippingAddress: {
        city: taxAddress.city || 'Auckland',
        state: taxAddress.stateOrProvince || 'Auckland',
        postalCode: taxAddress.postalCode || '1010',
        country: taxAddress.countryCode || 'NZ',
      },
      subtotal: Number(pricing.priceSubtotal?.value || 0),
      shippingFee: Number(pricing.deliveryCost?.value || 0),
      totalAmount: Number(pricing.total?.value || 0),
      currency: pricing.total?.currency || 'NZD',
      items: lineItems.map((item: any) => ({
        externalLineItemId: item.lineItemId,
        sku: item.sku || 'UNKNOWN-SKU',
        title: item.title,
        quantity: item.quantity,
        unitPrice: Number(item.lineItemCost?.value || 0) / (item.quantity || 1),
        totalPrice: Number(item.lineItemCost?.value || 0),
      })),
    };
  }

  /**
   * Maps internal condition identifiers to standard eBay condition enums.
   */
  private normalizeCondition(rawCondition: string): string | null {
    const cond = rawCondition.toUpperCase().replace(/\s+/g, '_');
    if (cond === 'NEW') return 'NEW';
    if (cond === 'LIKE_NEW') return 'LIKE_NEW';
    if (cond === 'REMANUFACTURED') return 'REMANUFACTURED';
    if (cond === 'USED_EXCELLENT' || cond.includes('EXCELLENT') || cond.includes('GRADE_A')) return 'USED_EXCELLENT';
    if (cond === 'USED_VERY_GOOD' || cond.includes('VERY_GOOD') || cond.includes('GRADE_B')) return 'USED_VERY_GOOD';
    if (cond === 'USED_GOOD' || cond.includes('GOOD') || cond.includes('GRADE_C')) return 'USED_GOOD';
    if (cond === 'FOR_PARTS_OR_NOT_WORKING' || cond.includes('PARTS') || cond.includes('SCRAP')) return 'FOR_PARTS_OR_NOT_WORKING';
    return null;
  }

  /**
   * Maps local NZ courier names to standard eBay carrier codes.
   */
  private mapCarrierCode(carrierName: string): string {
    const c = carrierName.toLowerCase();
    if (c.includes('courierpost') || c.includes('nzpost') || c.includes('nz post')) return 'CourierPost';
    if (c.includes('mainfreight')) return 'Mainfreight';
    if (c.includes('aramex')) return 'Aramex';
    if (c.includes('startrack')) return 'StarTrack';
    if (c.includes('auspost')) return 'Australia Post';
    return 'Other';
  }

  private resolveWebhookEntityType(eventType: string): 'PRODUCT' | 'LISTING' | 'CUSTOMER' | 'ORDER' {
    const upper = eventType.toUpperCase();
    if (upper.includes('ORDER')) return 'ORDER';
    if (upper.includes('INVENTORY') || upper.includes('STOCK')) return 'PRODUCT';
    if (upper.includes('LISTING') || upper.includes('OFFER')) return 'LISTING';
    if (upper.includes('ACCOUNT') || upper.includes('USER') || upper.includes('DELETION')) return 'CUSTOMER';
    return 'LISTING';
  }

  /**
   * Dispatches HTTP request to eBay with rate-limit and error checking.
   */
  private async callEbayApi(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    token: string,
    body: unknown,
    correlationId: string,
  ): Promise<unknown> {
    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Language': 'en-NZ',
        };

        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        if (res.status === 429) {
          throw new Error('eBay API Rate Limit Exceeded (HTTP 429 Too Many Requests)');
        }

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`eBay API error (HTTP ${res.status}): ${errBody}`);
        }

        if (res.status === 204) return {};
        const text = await res.text();
        return text ? JSON.parse(text) : {};
      } finally {
        clearTimeout(timer);
      }
    }, correlationId);
  }

  /**
   * Executes network call with exponential backoff and jitter on transient errors.
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, correlationId: string): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        const isTransient = this.isTransientError(err);
        if (!isTransient || attempt > this.MAX_RETRIES) {
          throw err;
        }

        const backoffMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 200, 5000);
        this.logger.warn(
          `[eBay] [${correlationId}] Retrying transient error (${(err as Error).message}) in ${Math.round(backoffMs)}ms (attempt ${attempt}/${this.MAX_RETRIES})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  private isTransientError(err: unknown): boolean {
    if (!err) return false;
    const msg = (err as Error).message?.toLowerCase() || '';
    return (
      msg.includes('429') ||
      msg.includes('rate limit') ||
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout')
    );
  }

  /**
   * Enforces client-side rate limiting tracker (max 60 req/min).
   */
  private enforceRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    // Prune entries older than 1 minute
    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0]! < oneMinuteAgo) {
      this.requestTimestamps.shift();
    }

    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      throw new Error(
        `Client-side rate limit reached for eBay API (${this.MAX_REQUESTS_PER_MINUTE} requests/min). Please back off before making further calls.`,
      );
    }

    this.requestTimestamps.push(now);
  }
}

