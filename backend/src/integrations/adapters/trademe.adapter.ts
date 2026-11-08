import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes } from 'crypto';
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
 * TRADE ME INTEGRATION ADAPTER — FIELD MAPPING & OWNERSHIP SPECIFICATION
 * =============================================================================
 *
 * 1. SKU:
 *    - Authoritative Owner: Pinnacle Internal Catalog
 *    - Trade Me Mapping: Sku (optional seller SKU reference field on Trade Me listing)
 *    - Rule: Max 50 chars, unique across catalog.
 *
 * 2. External Listing ID:
 *    - Authoritative Owner: Trade Me Marketplace
 *    - Internal Mapping: ExternalIdMapping (entityType: 'LISTING', externalId: ListingId)
 *    - Rule: Assigned by Trade Me upon successful POST /v1/Selling.json.
 *            A listing is NEVER reported as live unless Trade Me explicitly returns
 *            Success: true and a valid numeric ListingId.
 *
 * 3. Price & Currency:
 *    - Authoritative Owner: Pinnacle
 *    - Trade Me Mapping: BuyNowPrice & StartPrice
 *    - Rule: Must be in NZD ($ NZD) and strictly INCLUSIVE of statutory 15% GST
 *            in accordance with the NZ Fair Trading Act 1986 and Trade Me In-Trade rules.
 *
 * 4. Inventory Quantity:
 *    - Authoritative Owner: Pinnacle Warehouse Inventory
 *    - Trade Me Mapping: Quantity
 *    - Rule: Non-negative integer. Synced via Selling/Edit.json.
 *
 * 5. Listing Status:
 *    - Authoritative Owner: Shared / State Machine
 *    - Mapping:
 *      * Pinnacle PUBLISHED  <-> Trade Me Active
 *      * Pinnacle DRAFT      <-> Trade Me Unsold / Draft
 *      * Pinnacle ARCHIVED   <-> Trade Me Closed / Withdrawn
 *
 * 6. In-Trade Compliance:
 *    - Rule: In-Trade sellers in NZ must adhere to Consumer Guarantees Act 1993 (CGA).
 *    - Trade Me In-Trade flag (IsInTrade: true) is mandatory for Pinnacle.
 *
 * 7. Orders & Sold Items:
 *    - Authoritative Owner: Trade Me
 *    - Internal Mapping: ExternalIdMapping (entityType: 'ORDER', externalId: PurchaseId)
 *    - Rule: Deduplicated via idempotency key and syncHash.
 *
 * 8. Fulfilment & Tracking:
 *    - Authoritative Owner: Pinnacle Dispatch Operations
 *    - Trade Me Mapping: CourierPost / Mainfreight / NZ Post tracking details.
 * =============================================================================
 */

export interface TradeMeListingValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TradeMeShippingOption {
  type: number; // 1 = Free, 2 = Custom, 3 = Standard
  price?: number;
  method?: string;
}

export interface TradeMeListingPayload {
  sku: string;
  title: string;
  description: string;
  price: number; // NZD, 15% GST inclusive
  quantity: number;
  categoryId: string;
  duration?: number; // Days (e.g. 7, 14, 28)
  pickupOption?: number; // 1 = Allow pick up, 2 = Demand pick up, 3 = No pick up
  shippingOptions?: TradeMeShippingOption[];
  isBrandNew?: boolean;
  photoIds?: number[];
  imageUrls?: string[];
  listingId?: number | string;
  isMotorsCategory?: boolean;
}

export interface TradeMeFulfillmentPayload {
  orderId: string;
  purchaseId?: string;
  carrierName: string;
  trackingNumber: string;
  shippedDate?: string;
}

export interface TradeMeOAuthCredentials {
  consumerKey: string;
  consumerSecret: string;
  oauthToken: string;
  oauthTokenSecret: string;
  environment?: 'sandbox' | 'production';
}

@Injectable()
export class TradeMeAdapter implements IntegrationProviderAdapter {
  readonly providerKey = 'TRADE_ME';
  readonly displayName = 'Trade Me Motors & Parts (NZ)';
  readonly isMock = false;

  readonly capabilities: IntegrationCapability[] = [
    'CATALOG_PUBLISH',
    'INVENTORY_SYNC_OUTBOUND',
    'ORDERS_IMPORT',
    'ORDERS_STATUS_UPDATE',
    'WEBHOOK_INGESTION',
  ];

  private readonly logger = new Logger(TradeMeAdapter.name);

  // Rate Limiting Tracker (Trade Me allows up to 100 requests per minute in production)
  private readonly requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly TIMEOUT_MS = 8000;
  private readonly MAX_RETRIES = 2;

  // Simulation mode for deterministic automated testing and sandbox environments
  private simulationMode = false;
  private simulatedTransientFailure = false;
  private simulatedRateLimitFailure = false;
  private simulatedPermanentFailure = false;

  constructor(private readonly config: ConfigService) {}

  setSimulationMode(enabled: boolean) {
    this.simulationMode = enabled;
  }

  setSimulatedTransientFailure(enabled: boolean) {
    this.simulatedTransientFailure = enabled;
  }

  setSimulatedRateLimitFailure(enabled: boolean) {
    this.simulatedRateLimitFailure = enabled;
  }

  setSimulatedPermanentFailure(enabled: boolean) {
    this.simulatedPermanentFailure = enabled;
  }

  // ---------------------------------------------------------------------------
  // 1. Credentials Validation
  // ---------------------------------------------------------------------------

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    if (!credentials) return false;

    const consumerKey =
      credentials['consumerKey'] ??
      credentials['consumer_key'] ??
      credentials['apiKey'] ??
      this.config.get<string>('TRADEME_CONSUMER_KEY');

    const consumerSecret =
      credentials['consumerSecret'] ??
      credentials['consumer_secret'] ??
      credentials['apiSecret'] ??
      this.config.get<string>('TRADEME_CONSUMER_SECRET');

    const oauthToken =
      credentials['oauthToken'] ??
      credentials['oauth_token'] ??
      this.config.get<string>('TRADEME_OAUTH_TOKEN');

    const oauthTokenSecret =
      credentials['oauthTokenSecret'] ??
      credentials['oauth_token_secret'] ??
      this.config.get<string>('TRADEME_OAUTH_TOKEN_SECRET');

    // Trade Me OAuth 1.0a requires all 4 keys for in-trade seller API access
    return Boolean(
      consumerKey &&
        consumerKey.trim().length >= 8 &&
        consumerSecret &&
        consumerSecret.trim().length >= 8 &&
        oauthToken &&
        oauthToken.trim().length >= 8 &&
        oauthTokenSecret &&
        oauthTokenSecret.trim().length >= 8,
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Listing Pre-Publication Validation
  // ---------------------------------------------------------------------------

  /**
   * Validates Trade Me listing requirements before dispatching to Trade Me APIs.
   * Enforces Trade Me title limits (50 chars general / 80 chars motors),
   * pricing in NZD, quantity, shipping/pickup, and In-Trade requirements.
   */
  validateListingPayload(payload: TradeMeListingPayload): TradeMeListingValidationResult {
    const errors: string[] = [];

    // 1. SKU validation
    if (!payload.sku || typeof payload.sku !== 'string' || payload.sku.trim().length === 0) {
      errors.push('SKU is required and cannot be empty.');
    } else if (payload.sku.length > 50) {
      errors.push(`SKU exceeds maximum allowed length of 50 characters (got ${payload.sku.length}).`);
    }

    // 2. Title validation (Trade Me hard limits: 80 chars for Motors/Car Parts, 50 chars for General)
    const maxTitleLength = payload.isMotorsCategory ? 80 : 50;
    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0) {
      errors.push('Listing Title is required and cannot be empty.');
    } else if (payload.title.trim().length > maxTitleLength) {
      errors.push(
        `Listing Title exceeds Trade Me maximum limit of ${maxTitleLength} characters for this category (got ${payload.title.trim().length} characters). Please shorten the title.`,
      );
    }

    // 3. Price validation (BuyNowPrice must be > 0 and in NZD inclusive of 15% GST)
    if (typeof payload.price !== 'number' || isNaN(payload.price) || payload.price <= 0) {
      errors.push(`Buy Now Price must be a positive number greater than $0.00 NZD (got "${payload.price}").`);
    }

    // 4. Quantity validation
    if (typeof payload.quantity !== 'number' || isNaN(payload.quantity) || payload.quantity < 0) {
      errors.push(`Available inventory quantity must be a non-negative integer (got "${payload.quantity}").`);
    }

    // 5. Category ID validation
    if (!payload.categoryId || typeof payload.categoryId !== 'string' || payload.categoryId.trim().length === 0) {
      errors.push('Valid Trade Me Category ID is required.');
    }

    // 6. Description validation
    if (!payload.description || typeof payload.description !== 'string' || payload.description.trim().length === 0) {
      errors.push('Listing Description is required and cannot be empty.');
    }

    // 7. Shipping or Pickup fulfillment requirement
    // Trade Me mandates that a listing must specify either pick up or at least one shipping option
    const hasShipping = Array.isArray(payload.shippingOptions) && payload.shippingOptions.length > 0;
    const allowsPickup = payload.pickupOption === 1 || payload.pickupOption === 2;
    if (!hasShipping && !allowsPickup) {
      errors.push(
        'Trade Me requires at least one shipping option or depot pickup enabled (Pickup: 1 or 2) for all listings.',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. OAuth 1.0a Signature & Header Generation
  // ---------------------------------------------------------------------------

  /**
   * Generates the standard OAuth 1.0a Authorization header for Trade Me API calls.
   * Uses HMAC-SHA1 signature per RFC 5849.
   */
  generateOAuth1Header(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    credentials: TradeMeOAuthCredentials,
    extraParams: Record<string, string> = {},
  ): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: credentials.consumerKey,
      oauth_token: credentials.oauthToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: randomBytes(16).toString('hex'),
      oauth_version: '1.0',
      ...extraParams,
    };

    // Sort all parameters lexicographically by key
    const sortedKeys = Object.keys(oauthParams).sort();
    const paramString = sortedKeys
      .map((k) => `${this.rfc3986Encode(k)}=${this.rfc3986Encode(oauthParams[k]!)}`)
      .join('&');

    // Parse base URL (without query params)
    const baseUrl = url.split('?')[0]!;

    // Construct signature base string
    const signatureBase = `${method.toUpperCase()}&${this.rfc3986Encode(baseUrl)}&${this.rfc3986Encode(paramString)}`;

    // Key is consumerSecret&tokenSecret
    const signingKey = `${this.rfc3986Encode(credentials.consumerSecret)}&${this.rfc3986Encode(credentials.oauthTokenSecret)}`;

    const signature = createHmac('sha1', signingKey).update(signatureBase).digest('base64');

    oauthParams['oauth_signature'] = signature;

    // Build OAuth Authorization header string
    const headerParts = Object.keys(oauthParams)
      .filter((k) => k.startsWith('oauth_'))
      .sort()
      .map((k) => `${this.rfc3986Encode(k)}="${this.rfc3986Encode(oauthParams[k]!)}"`);

    return `OAuth ${headerParts.join(', ')}`;
  }

  // ---------------------------------------------------------------------------
  // 4. Webhook & Notification Verification
  // ---------------------------------------------------------------------------

  async verifyWebhookSignature(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string,
  ): Promise<WebhookVerificationResult> {
    const rawSignature = headers['x-trademe-signature'] || headers['x-signature'];
    const signature = Array.isArray(rawSignature) ? rawSignature[0] : rawSignature;

    const rawTimestamp = headers['x-trademe-timestamp'] || headers['x-timestamp'];
    const timestampStr = Array.isArray(rawTimestamp) ? rawTimestamp[0] : rawTimestamp;

    const rawBody = typeof payload === 'string' ? payload : payload.toString('utf8');

    // Handle verification challenge token if Trade Me endpoint registration challenge
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed.challengeCode || parsed.verificationCode) {
        return {
          isValid: true,
          timestamp: Math.floor(Date.now() / 1000),
        };
      }
    } catch {
      // Continue with signature verification
    }

    if (!signature) {
      return {
        isValid: false,
        failureReason: 'Missing X-TRADEME-SIGNATURE header in webhook request.',
      };
    }

    // Replay attack prevention: 5-minute timestamp window
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

    // Verify HMAC-SHA256 signature if secret configured
    if (secret) {
      const expectedHmac = createHmac('sha256', secret).update(rawBody).digest('hex');
      const expectedBase64 = createHmac('sha256', secret).update(rawBody).digest('base64');

      if (signature !== expectedHmac && signature !== expectedBase64) {
        return {
          isValid: false,
          failureReason: 'Cryptographic HMAC signature mismatch against configured Trade Me webhook secret.',
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
      rawPayload.eventType ||
      rawPayload.EventType ||
      rawPayload.notificationType ||
      'TRADEME_ORDER_SOLD';

    const externalId =
      rawPayload.purchaseId ||
      rawPayload.PurchaseId ||
      rawPayload.listingId ||
      rawPayload.ListingId ||
      `trademe_evt_${Date.now()}`;

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
    const correlationId = input.correlationId || `tm-sync-${Date.now()}`;

    // Handle simulated test failure triggers
    if (this.simulatedRateLimitFailure) {
      return {
        success: false,
        isTransient: true,
        error: 'Trade Me API Rate Limit Exceeded: HTTP 429 Too Many Requests (Simulated Backoff Trigger)',
      };
    }

    if (this.simulatedTransientFailure) {
      return {
        success: false,
        isTransient: true,
        error: 'Trade Me Gateway Timeout: HTTP 504 (Simulated Transient Failure)',
      };
    }

    if (this.simulatedPermanentFailure) {
      return {
        success: false,
        isTransient: false,
        error: 'Trade Me In-Trade Permission Error: Account is not authorized for In-Trade commercial motor spares publication (Permanent Failure).',
      };
    }

    try {
      this.enforceRateLimit();

      switch (input.jobType) {
        case 'CATALOG_PUBLISH':
        case 'LISTING_CREATE':
          return await this.executeListingPublish(input, correlationId);

        case 'LISTING_UPDATE':
          return await this.executeListingUpdate(input, correlationId);

        case 'LISTING_WITHDRAW':
          return await this.executeListingWithdraw(input, correlationId);

        case 'INVENTORY_SYNC_OUTBOUND':
        case 'STOCK_UPDATE':
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
              message: `Trade Me adapter received unhandled jobType "${input.jobType}". Acknowledged without action.`,
            },
          };
      }
    } catch (err) {
      const errorMsg = (err as Error).message || 'Unknown Trade Me sync error';
      const isTransient = this.isTransientError(err);

      this.logger.error(`[Trade Me] [${correlationId}] Sync job failed: ${errorMsg}`, (err as Error).stack);

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
   * Publication Flow (Selling API: POST /v1/Selling.json):
   * 1. Validates listing requirements.
   * 2. NEVER reports listing as live unless Trade Me explicitly returns Success: true
   *    and a valid ListingId.
   */
  private async executeListingPublish(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const rawPayload = (input.payload || {}) as unknown as TradeMeListingPayload;

    // 1. Pre-publication Validation
    const validation = this.validateListingPayload(rawPayload);
    if (!validation.isValid) {
      this.logger.warn(
        `[Trade Me] [${correlationId}] Listing validation failed for SKU "${rawPayload.sku}": ${validation.errors.join('; ')}`,
      );
      return {
        success: false,
        isTransient: false, // Validation errors are permanent until user corrects payload
        error: `Trade Me Listing Validation Failed: ${validation.errors.join(' | ')}`,
      };
    }

    const sku = rawPayload.sku.trim();
    const price = rawPayload.price;
    const quantity = rawPayload.quantity;

    // 2. In simulation mode or sandbox test, simulate realistic Trade Me response
    if (this.simulationMode) {
      const simulatedListingId = `TM-${Date.now().toString().slice(-8)}`;
      const syncHash = createHash('sha256')
        .update(JSON.stringify({ sku, price, quantity, simulatedListingId, status: 'Active' }))
        .digest('hex');

      return {
        success: true,
        externalId: simulatedListingId,
        syncHash,
        data: {
          sku,
          listingId: simulatedListingId,
          status: 'Active',
          buyNowPrice: price,
          quantity,
          currency: 'NZD',
          isInTrade: true,
          publishedAt: new Date().toISOString(),
          attribution: 'Trade Me Motors In-Trade API (Simulated)',
        },
      };
    }

    // 3. Live API Call (Verify credentials before calling)
    const creds = this.resolveCredentials(input.credentials);
    if (!creds) {
      throw new Error(
        'Trade Me live API call blocked: Required OAuth 1.0a credentials (TRADEME_CONSUMER_KEY, TRADEME_OAUTH_TOKEN, etc.) are not configured. Configure credentials in Integration Settings.',
      );
    }

    const environment = (input.settings?.['environment'] as string) || creds.environment || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.trademe.co.nz/v1'
        : 'https://api.tmsandbox.co.nz/v1';

    const endpoint = `${baseUrl}/Selling.json`;

    // Map to Trade Me Selling API payload
    const tradeMeBody = {
      Category: rawPayload.categoryId,
      Title: rawPayload.title.trim().slice(0, rawPayload.isMotorsCategory ? 80 : 50),
      Description: [rawPayload.description.trim()],
      Duration: rawPayload.duration || 14,
      BuyNowPrice: Number(price.toFixed(2)),
      StartPrice: Number(price.toFixed(2)), // Fixed price listing
      IsBrandNew: Boolean(rawPayload.isBrandNew),
      IsInTrade: true, // Mandatory In-Trade compliance
      Pickup: rawPayload.pickupOption || 1, // 1 = Allow pick up
      PaymentMethods: [2, 4, 8], // Bank deposit, Ping, Cash on pickup
      ShippingOptions: (rawPayload.shippingOptions || []).map((s) => ({
        Type: s.type,
        Price: s.price,
        Method: s.method,
      })),
      PhotoIds: rawPayload.photoIds || [],
      Sku: sku,
      Quantity: quantity,
    };

    const authHeader = this.generateOAuth1Header(endpoint, 'POST', creds);

    const res = (await this.callTradeMeApi(
      endpoint,
      'POST',
      authHeader,
      tradeMeBody,
      correlationId,
    )) as { Success?: boolean; Description?: string; ListingId?: number };

    // CRITICAL REQUIREMENT: Never report a listing as live unless the provider confirms it
    if (!res.Success || !res.ListingId) {
      return {
        success: false,
        isTransient: false,
        error: `Trade Me rejected listing publication: ${res.Description || 'Provider did not confirm active listing.'}`,
      };
    }

    const listingId = String(res.ListingId);
    const syncHash = createHash('sha256')
      .update(JSON.stringify({ sku, price, quantity, listingId, status: 'Active' }))
      .digest('hex');

    return {
      success: true,
      externalId: listingId,
      syncHash,
      data: {
        sku,
        listingId,
        status: 'Active',
        buyNowPrice: price,
        quantity,
        publishedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Update Flow (POST /v1/Selling/Edit.json):
   * Updates an existing active Trade Me listing.
   */
  private async executeListingUpdate(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const rawPayload = (input.payload || {}) as unknown as TradeMeListingPayload;
    const listingId = rawPayload.listingId;

    if (!listingId) {
      return {
        success: false,
        isTransient: false,
        error: 'Trade Me listing update requires an external ListingId.',
      };
    }

    if (this.simulationMode) {
      const syncHash = createHash('sha256')
        .update(JSON.stringify({ listingId, price: rawPayload.price, quantity: rawPayload.quantity, updatedAt: Date.now() }))
        .digest('hex');

      return {
        success: true,
        externalId: String(listingId),
        syncHash,
        data: {
          listingId: String(listingId),
          status: 'Active',
          updatedAt: new Date().toISOString(),
        },
      };
    }

    const creds = this.resolveCredentials(input.credentials);
    if (!creds) {
      throw new Error('Trade Me live API call blocked: Unconfigured OAuth credentials.');
    }

    const environment = (input.settings?.['environment'] as string) || creds.environment || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.trademe.co.nz/v1'
        : 'https://api.tmsandbox.co.nz/v1';

    const endpoint = `${baseUrl}/Selling/Edit.json`;

    const updateBody = {
      ListingId: Number(listingId),
      BuyNowPrice: rawPayload.price ? Number(rawPayload.price.toFixed(2)) : undefined,
      Quantity: rawPayload.quantity,
      Title: rawPayload.title ? rawPayload.title.trim().slice(0, rawPayload.isMotorsCategory ? 80 : 50) : undefined,
    };

    const authHeader = this.generateOAuth1Header(endpoint, 'POST', creds);
    const res = (await this.callTradeMeApi(
      endpoint,
      'POST',
      authHeader,
      updateBody,
      correlationId,
    )) as { Success?: boolean; Description?: string };

    if (!res.Success) {
      return {
        success: false,
        isTransient: false,
        error: `Trade Me rejected listing edit: ${res.Description || 'Provider did not confirm update.'}`,
      };
    }

    const syncHash = createHash('sha256')
      .update(JSON.stringify({ listingId, updateBody }))
      .digest('hex');

    return {
      success: true,
      externalId: String(listingId),
      syncHash,
      data: {
        listingId: String(listingId),
        status: 'Active',
        updatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Withdrawal Flow (POST /v1/Selling/Withdraw.json):
   * Withdraws an active listing from Trade Me.
   */
  private async executeListingWithdraw(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const payload = input.payload || {};
    const listingId = payload['listingId'] || payload['externalId'];

    if (!listingId) {
      return {
        success: false,
        isTransient: false,
        error: 'Trade Me listing withdrawal requires a valid ListingId.',
      };
    }

    if (this.simulationMode) {
      return {
        success: true,
        externalId: String(listingId),
        syncHash: `withdrawn_${listingId}`,
        data: {
          listingId: String(listingId),
          status: 'Withdrawn',
          withdrawnAt: new Date().toISOString(),
        },
      };
    }

    const creds = this.resolveCredentials(input.credentials);
    if (!creds) {
      throw new Error('Trade Me live API call blocked: Unconfigured OAuth credentials.');
    }

    const environment = (input.settings?.['environment'] as string) || creds.environment || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.trademe.co.nz/v1'
        : 'https://api.tmsandbox.co.nz/v1';

    const endpoint = `${baseUrl}/Selling/Withdraw.json`;
    const withdrawBody = {
      ListingId: Number(listingId),
      Reason: 1, // 1 = Sold elsewhere or stock removed
    };

    const authHeader = this.generateOAuth1Header(endpoint, 'POST', creds);
    const res = (await this.callTradeMeApi(
      endpoint,
      'POST',
      authHeader,
      withdrawBody,
      correlationId,
    )) as { Success?: boolean; Description?: string };

    if (!res.Success) {
      return {
        success: false,
        isTransient: false,
        error: `Trade Me rejected withdrawal: ${res.Description || 'Provider did not confirm withdrawal.'}`,
      };
    }

    return {
      success: true,
      externalId: String(listingId),
      syncHash: `withdrawn_${listingId}`,
      data: {
        listingId: String(listingId),
        status: 'Withdrawn',
        withdrawnAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Fast Inventory Stock Sync:
   * Adjusts quantity for fixed-price listing.
   */
  private async executeInventorySync(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const payload = input.payload || {};
    const sku = (payload['sku'] as string)?.trim();
    const listingId = payload['listingId'];
    const quantity = Number(payload['quantity']);

    if (!sku) {
      return {
        success: false,
        isTransient: false,
        error: 'Trade Me stock update requires a SKU.',
      };
    }

    if (isNaN(quantity) || quantity < 0) {
      return {
        success: false,
        isTransient: false,
        error: `Invalid inventory quantity "${payload['quantity']}". Quantity must be non-negative.`,
      };
    }

    const syncHash = createHash('sha256')
      .update(JSON.stringify({ sku, listingId, quantity }))
      .digest('hex');

    if (this.simulationMode) {
      return {
        success: true,
        externalId: String(listingId || sku),
        syncHash,
        data: {
          sku,
          listingId: listingId ? String(listingId) : undefined,
          syncedQuantity: quantity,
          status: quantity > 0 ? 'Active' : 'ZeroStock',
          updatedAt: new Date().toISOString(),
        },
      };
    }

    const creds = this.resolveCredentials(input.credentials);
    if (!creds) {
      throw new Error('Trade Me live API call blocked: Unconfigured OAuth credentials.');
    }

    if (!listingId) {
      return {
        success: false,
        isTransient: false,
        error: 'Live Trade Me stock update requires associated ListingId.',
      };
    }

    const environment = (input.settings?.['environment'] as string) || creds.environment || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.trademe.co.nz/v1'
        : 'https://api.tmsandbox.co.nz/v1';

    const endpoint = `${baseUrl}/Selling/Edit.json`;
    const updateBody = {
      ListingId: Number(listingId),
      Quantity: quantity,
    };

    const authHeader = this.generateOAuth1Header(endpoint, 'POST', creds);
    await this.callTradeMeApi(endpoint, 'POST', authHeader, updateBody, correlationId);

    return {
      success: true,
      externalId: String(listingId),
      syncHash,
      data: {
        sku,
        listingId: String(listingId),
        syncedQuantity: quantity,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Sold Items / Order Import (GET /v1/MyTradeMe/SoldItems/All.json):
   * Queries sold items from Trade Me and maps to canonical internal order schema.
   */
  private async executeOrderImport(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    if (this.simulationMode) {
      const mockPurchaseId = `TM-PUR-${Date.now().toString().slice(-6)}`;
      const mockOrder = {
        PurchaseId: mockPurchaseId,
        ListingId: 10984210,
        Title: 'Michelin Pilot Sport 5 225/45R17 - Pair (2 tyres)',
        Sku: 'TYR-MICH-2254517-PS5',
        SoldPrice: 580.0, // NZD
        QuantitySold: 1,
        SoldDate: new Date().toISOString(),
        Buyer: {
          MemberId: 88412,
          Nickname: 'auckland_mechanic_44',
          Email: 'trade@aucklandmechanical.co.nz',
          Address: {
            Address1: '18 Industry Road',
            Suburb: 'Penrose',
            City: 'Auckland',
            Postcode: '1061',
            PhoneNumber: '021 890 123',
          },
        },
        DeliveryMethod: 'Courier Freight (CourierPost)',
        PaymentStatus: 'Paid',
      };

      const normalized = [this.normalizeTradeMeOrder(mockOrder)];

      return {
        success: true,
        data: {
          importedCount: normalized.length,
          orders: normalized,
        },
      };
    }

    const creds = this.resolveCredentials(input.credentials);
    if (!creds) {
      throw new Error('Trade Me live API call blocked: Unconfigured OAuth credentials.');
    }

    const environment = (input.settings?.['environment'] as string) || creds.environment || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.trademe.co.nz/v1'
        : 'https://api.tmsandbox.co.nz/v1';

    const endpoint = `${baseUrl}/MyTradeMe/SoldItems/All.json`;
    const authHeader = this.generateOAuth1Header(endpoint, 'GET', creds);

    const res = (await this.callTradeMeApi(
      endpoint,
      'GET',
      authHeader,
      undefined,
      correlationId,
    )) as { List?: any[]; TotalCount?: number };

    const rawList = res.List || [];
    const normalized = rawList.map((item) => this.normalizeTradeMeOrder(item));

    return {
      success: true,
      data: {
        importedCount: normalized.length,
        orders: normalized,
      },
    };
  }

  /**
   * Dispatch & Tracking Update:
   * Confirms courier dispatch with carrier and tracking number.
   */
  private async executeFulfillmentUpdate(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const payload = (input.payload || {}) as unknown as TradeMeFulfillmentPayload;
    const orderId = payload.orderId || payload.purchaseId;
    const carrierName = payload.carrierName || 'CourierPost';
    const trackingNumber = payload.trackingNumber?.trim();

    if (!orderId) {
      return {
        success: false,
        isTransient: false,
        error: 'Trade Me fulfillment update requires an external orderId or purchaseId.',
      };
    }

    if (!trackingNumber) {
      return {
        success: false,
        isTransient: false,
        error: 'Trade Me fulfillment update requires a shipment tracking number.',
      };
    }

    const syncHash = createHash('sha256')
      .update(JSON.stringify({ orderId, carrierName, trackingNumber }))
      .digest('hex');

    if (this.simulationMode) {
      const simulatedDispatchId = `TM-DISPATCH-${Date.now().toString().slice(-6)}`;
      return {
        success: true,
        externalId: simulatedDispatchId,
        syncHash,
        data: {
          dispatchId: simulatedDispatchId,
          orderId: String(orderId),
          carrierName,
          trackingNumber,
          shippedAt: new Date().toISOString(),
          status: 'DISPATCHED',
        },
      };
    }

    const creds = this.resolveCredentials(input.credentials);
    if (!creds) {
      throw new Error('Trade Me live API call blocked: Unconfigured OAuth credentials.');
    }

    const environment = (input.settings?.['environment'] as string) || creds.environment || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.trademe.co.nz/v1'
        : 'https://api.tmsandbox.co.nz/v1';

    const endpoint = `${baseUrl}/MyTradeMe/SetTrackingDetails.json`;
    const trackingBody = {
      PurchaseId: String(orderId),
      Carrier: carrierName,
      TrackingNumber: trackingNumber,
    };

    const authHeader = this.generateOAuth1Header(endpoint, 'POST', creds);
    await this.callTradeMeApi(endpoint, 'POST', authHeader, trackingBody, correlationId);

    return {
      success: true,
      externalId: String(orderId),
      syncHash,
      data: {
        orderId: String(orderId),
        carrierName,
        trackingNumber,
        status: 'DISPATCHED',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 7. Internal Helpers & Normalizers
  // ---------------------------------------------------------------------------

  /**
   * Normalizes an external Trade Me sold order into internal canonical format.
   */
  private normalizeTradeMeOrder(tmOrder: any): Record<string, unknown> {
    const buyer = tmOrder.Buyer || {};
    const addr = buyer.Address || {};
    const soldPrice = Number(tmOrder.SoldPrice || 0);

    return {
      externalOrderId: String(tmOrder.PurchaseId || tmOrder.ListingId),
      orderSource: 'TRADE_ME_MARKETPLACE',
      orderDate: tmOrder.SoldDate || new Date().toISOString(),
      paymentStatus: tmOrder.PaymentStatus === 'Paid' ? 'PAID' : 'PENDING_PAYMENT',
      fulfillmentStatus: 'UNFULFILLED',
      customerName: buyer.Nickname || 'Trade Me Customer',
      customerEmail: buyer.Email || `${buyer.Nickname || 'customer'}@members.trademe.co.nz`,
      shippingAddress: {
        line1: addr.Address1 || '18 Industry Road',
        suburb: addr.Suburb || 'Penrose',
        city: addr.City || 'Auckland',
        postalCode: addr.Postcode || '1061',
        country: 'NZ',
        phone: addr.PhoneNumber || '0800 PINNACLE',
      },
      subtotal: soldPrice,
      shippingFee: 0.0,
      totalAmount: soldPrice,
      currency: 'NZD',
      items: [
        {
          externalLineItemId: String(tmOrder.ListingId),
          sku: tmOrder.Sku || 'UNKNOWN-SKU',
          title: tmOrder.Title,
          quantity: tmOrder.QuantitySold || 1,
          unitPrice: soldPrice / (tmOrder.QuantitySold || 1),
          totalPrice: soldPrice,
        },
      ],
    };
  }

  private resolveCredentials(credentials?: Record<string, string>): TradeMeOAuthCredentials | null {
    const consumerKey =
      credentials?.['consumerKey'] ||
      credentials?.['consumer_key'] ||
      this.config.get<string>('TRADEME_CONSUMER_KEY');

    const consumerSecret =
      credentials?.['consumerSecret'] ||
      credentials?.['consumer_secret'] ||
      this.config.get<string>('TRADEME_CONSUMER_SECRET');

    const oauthToken =
      credentials?.['oauthToken'] ||
      credentials?.['oauth_token'] ||
      this.config.get<string>('TRADEME_OAUTH_TOKEN');

    const oauthTokenSecret =
      credentials?.['oauthTokenSecret'] ||
      credentials?.['oauth_token_secret'] ||
      this.config.get<string>('TRADEME_OAUTH_TOKEN_SECRET');

    const environment =
      (credentials?.['environment'] as 'sandbox' | 'production') ||
      (this.config.get<string>('TRADEME_ENVIRONMENT') as 'sandbox' | 'production') ||
      'sandbox';

    if (!consumerKey || !consumerSecret || !oauthToken || !oauthTokenSecret) {
      return null;
    }

    return {
      consumerKey: consumerKey.trim(),
      consumerSecret: consumerSecret.trim(),
      oauthToken: oauthToken.trim(),
      oauthTokenSecret: oauthTokenSecret.trim(),
      environment,
    };
  }

  private resolveWebhookEntityType(eventType: string): 'PRODUCT' | 'LISTING' | 'CUSTOMER' | 'ORDER' {
    const upper = eventType.toUpperCase();
    if (upper.includes('SOLD') || upper.includes('ORDER') || upper.includes('PURCHASE')) return 'ORDER';
    if (upper.includes('STOCK') || upper.includes('INVENTORY')) return 'PRODUCT';
    if (upper.includes('LISTING') || upper.includes('WITHDRAW')) return 'LISTING';
    if (upper.includes('MEMBER') || upper.includes('ACCOUNT')) return 'CUSTOMER';
    return 'LISTING';
  }

  private rfc3986Encode(str: string): string {
    return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  }

  /**
   * Dispatches HTTP request to Trade Me REST API with OAuth 1.0a and retry logic.
   */
  private async callTradeMeApi(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    authHeader: string,
    body: unknown,
    correlationId: string,
  ): Promise<unknown> {
    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      try {
        const headers: Record<string, string> = {
          Authorization: authHeader,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        };

        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        if (res.status === 429) {
          throw new Error('Trade Me API Rate Limit Exceeded (HTTP 429 Too Many Requests)');
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Trade Me API error (HTTP ${res.status}): ${errText}`);
        }

        if (res.status === 204) return {};
        const text = await res.text();
        return text ? JSON.parse(text) : {};
      } finally {
        clearTimeout(timer);
      }
    }, correlationId);
  }

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
          `[Trade Me] [${correlationId}] Retrying transient error (${(err as Error).message}) in ${Math.round(backoffMs)}ms (attempt ${attempt}/${this.MAX_RETRIES})...`,
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

  private enforceRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0]! < oneMinuteAgo) {
      this.requestTimestamps.shift();
    }

    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      throw new Error(
        `Client-side rate limit reached for Trade Me API (${this.MAX_REQUESTS_PER_MINUTE} requests/min). Please back off before making further calls.`,
      );
    }

    this.requestTimestamps.push(now);
  }
}

