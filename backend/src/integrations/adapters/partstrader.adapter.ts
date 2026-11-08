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
 * PARTSTRADER PROCUREMENT ADAPTER — FIELD MAPPING & OWNERSHIP SPECIFICATION
 * =============================================================================
 *
 * 1. Scope & Provider Context:
 *    - Platform: PartsTrader Markets Ltd (New Zealand: partstrader.co.nz)
 *    - Purpose: Collision repair parts sourcing, insurance quoting, and trade procurement.
 *    - Commercial Terms: Supplier quoting is legally binding. Pricing must be in NZD,
 *      inclusive of 15% GST where quoted to collision repairers.
 *    - Privacy Compliance: Customer/claim PII is protected under NZ Privacy Act 2020.
 *
 * 2. Supported Workflows:
 *    - Inbound: Purchase Order Import (ORDERS_IMPORT) — repairers awarding won quotes.
 *    - Outbound: Quote Response Submission (QUOTE_SUBMIT) — binding parts availability & pricing.
 *    - Outbound: Fulfillment & Dispatch Tracking (ORDERS_STATUS_UPDATE) — tracking numbers.
 *    - Manual Batch Fallback: Structured CSV import/export for unautomated accounts.
 *
 * 3. Field Mapping & Ownership:
 *    - QuoteRequestId / PurchaseOrderId: Owner = PartsTrader
 *    - Internal SKU: Owner = Pinnacle
 *    - Quote Pricing: Owner = Pinnacle (in NZD, 15% GST statutory standard)
 *    - Dispatch / Tracking: Owner = Pinnacle (CourierPost / Mainfreight)
 * =============================================================================
 */

export interface PartsTraderQuoteItem {
  partNumber: string;
  description: string;
  quantityRequired: number;
  pinnacleSku?: string;
  quotedUnitPrice?: number;
  partCondition?: 'GENUINE_OEM' | 'RECYCLED_OEM' | 'REMANUFACTURED' | 'AFTERMARKET';
  deliveryDays?: number;
  available?: boolean;
}

export interface PartsTraderQuotePayload {
  quoteRequestId: string;
  repairerWorkshop: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
    vin?: string;
    registrationPlate?: string;
  };
  items: PartsTraderQuoteItem[];
}

export interface PartsTraderFulfillmentPayload {
  orderId: string;
  purchaseOrderId?: string;
  carrierName: string;
  trackingNumber: string;
  shippedDate?: string;
}

export interface PartsTraderCredentials {
  supplierId: string;
  apiKey: string;
  apiSecret?: string;
  environment?: 'sandbox' | 'production';
}

@Injectable()
export class PartsTraderAdapter implements IntegrationProviderAdapter {
  readonly providerKey = 'PARTSTRADER';
  readonly displayName = 'PartsTrader Procurement (NZ)';
  readonly isMock = false;

  readonly capabilities: IntegrationCapability[] = [
    'ORDERS_IMPORT',
    'ORDERS_STATUS_UPDATE',
    'WEBHOOK_INGESTION',
  ];

  private readonly logger = new Logger(PartsTraderAdapter.name);

  // Rate Limiting Tracker (Sliding window: default 60 req/min)
  private readonly requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly TIMEOUT_MS = 8000;
  private readonly MAX_RETRIES = 2;

  // Simulation mode for deterministic automated testing and sandbox environments
  private simulationMode = false;
  private simulatedTransientFailure = false;
  private simulatedRateLimitFailure = false;

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

  // ---------------------------------------------------------------------------
  // 1. Credentials Validation
  // ---------------------------------------------------------------------------

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    if (!credentials) return false;

    const supplierId =
      credentials['supplierId'] ??
      credentials['supplier_id'] ??
      credentials['apiKey'] ??
      this.config.get<string>('PARTSTRADER_SUPPLIER_ID');

    const apiKey =
      credentials['apiKey'] ??
      credentials['api_key'] ??
      credentials['apiSecret'] ??
      this.config.get<string>('PARTSTRADER_API_KEY');

    return Boolean(
      supplierId &&
        supplierId.trim().length >= 4 &&
        apiKey &&
        apiKey.trim().length >= 8,
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Webhook & Notification Verification
  // ---------------------------------------------------------------------------

  async verifyWebhookSignature(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string,
  ): Promise<WebhookVerificationResult> {
    const rawSignature = headers['x-partstrader-signature'] || headers['x-signature'];
    const signature = Array.isArray(rawSignature) ? rawSignature[0] : rawSignature;

    const rawTimestamp = headers['x-partstrader-timestamp'] || headers['x-timestamp'];
    const timestampStr = Array.isArray(rawTimestamp) ? rawTimestamp[0] : rawTimestamp;

    const rawBody = typeof payload === 'string' ? payload : payload.toString('utf8');

    // Handle verification challenge response
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed.challenge || parsed.verificationToken) {
        return {
          isValid: true,
          timestamp: Math.floor(Date.now() / 1000),
        };
      }
    } catch {
      // Continue with signature check
    }

    if (!signature) {
      return {
        isValid: false,
        failureReason: 'Missing X-PARTSTRADER-SIGNATURE header in webhook payload.',
      };
    }

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

    if (secret) {
      const expectedHmac = createHmac('sha256', secret).update(rawBody).digest('hex');
      const expectedBase64 = createHmac('sha256', secret).update(rawBody).digest('base64');

      if (signature !== expectedHmac && signature !== expectedBase64) {
        return {
          isValid: false,
          failureReason: 'Cryptographic HMAC signature mismatch against configured PartsTrader secret.',
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
      rawPayload.type ||
      'PARTSTRADER_ORDER_AWARDED';

    const externalId =
      rawPayload.purchaseOrderId ||
      rawPayload.quoteRequestId ||
      rawPayload.id ||
      `pt_evt_${Date.now()}`;

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
  // 3. Sync Job Execution Dispatcher
  // ---------------------------------------------------------------------------

  async executeSync(input: SyncJobExecutionInput): Promise<SyncJobExecutionResult> {
    const correlationId = input.correlationId || `pt-sync-${Date.now()}`;

    if (this.simulatedRateLimitFailure) {
      return {
        success: false,
        isTransient: true,
        error: 'PartsTrader API Rate Limit Exceeded: HTTP 429 Too Many Requests (Simulated Backoff Trigger)',
      };
    }

    if (this.simulatedTransientFailure) {
      return {
        success: false,
        isTransient: true,
        error: 'PartsTrader Gateway Timeout: HTTP 504 (Simulated Transient Failure)',
      };
    }

    try {
      this.enforceRateLimit();

      switch (input.jobType) {
        case 'ORDERS_IMPORT':
        case 'PURCHASE_ORDERS_IMPORT':
          return await this.executeOrderImport(input, correlationId);

        case 'ORDERS_STATUS_UPDATE':
        case 'FULFILLMENT_UPDATE':
          return await this.executeFulfillmentUpdate(input, correlationId);

        case 'QUOTE_SUBMIT':
        case 'SUBMIT_QUOTE':
          return await this.executeQuoteSubmission(input, correlationId);

        case 'MANUAL_BATCH_IMPORT':
          return await this.executeManualBatchImport(input, correlationId);

        default:
          return {
            success: true,
            data: {
              message: `PartsTrader adapter received unhandled jobType "${input.jobType}". Acknowledged without action.`,
            },
          };
      }
    } catch (err) {
      const errorMsg = (err as Error).message || 'Unknown PartsTrader sync error';
      const isTransient = this.isTransientError(err);

      this.logger.error(`[PartsTrader] [${correlationId}] Sync job failed: ${errorMsg}`, (err as Error).stack);

      return {
        success: false,
        isTransient,
        error: errorMsg,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Capability Handlers
  // ---------------------------------------------------------------------------

  /**
   * Purchase Order Import (ORDERS_IMPORT):
   * Imports confirmed purchase orders awarded by collision repairers.
   */
  private async executeOrderImport(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    if (this.simulationMode) {
      const mockPoId = `PT-PO-${Date.now().toString().slice(-6)}`;
      const mockOrder = {
        purchaseOrderId: mockPoId,
        quoteRequestId: 'PT-RFQ-88412',
        repairerName: 'Penrose Collision Repairers Ltd',
        claimNumber: 'CLM-NZ-882194',
        insurer: 'IAG New Zealand',
        vehicle: {
          make: 'Toyota',
          model: 'RAV4',
          year: 2021,
          plate: 'NZ-RAV50',
        },
        deliveryAddress: {
          line1: '14 Industry Road',
          city: 'Penrose',
          region: 'Auckland',
          postcode: '1061',
          country: 'NZ',
        },
        orderDate: new Date().toISOString(),
        totalAmount: 480.0, // NZD 15% GST inclusive
        items: [
          {
            partNumber: 'SB-TOY-RAV4-FR',
            pinnacleSku: 'BELT-TOY-RAV4-FR-01',
            description: 'Toyota RAV4 Front Right Seat Belt Assembly (Tested 2.2Ω)',
            condition: 'RECYCLED_OEM',
            quantity: 1,
            unitPrice: 480.0,
          },
        ],
      };

      const normalized = [this.normalizePartsTraderOrder(mockOrder)];

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
      throw new Error(
        'PartsTrader live API call blocked: Unconfigured credentials. Configure PARTSTRADER_SUPPLIER_ID and PARTSTRADER_API_KEY in Integration Settings.',
      );
    }

    const environment = (input.settings?.['environment'] as string) || creds.environment || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.partstrader.co.nz/v1'
        : 'https://sandbox.partstrader.co.nz/api/v1';

    const endpoint = `${baseUrl}/orders/pending`;
    const res = (await this.callPartsTraderApi(
      endpoint,
      'GET',
      creds,
      undefined,
      correlationId,
    )) as { orders?: any[] };

    const rawOrders = res.orders || [];
    const normalized = rawOrders.map((o) => this.normalizePartsTraderOrder(o));

    return {
      success: true,
      data: {
        importedCount: normalized.length,
        orders: normalized,
      },
    };
  }

  /**
   * Fulfillment Status Update (ORDERS_STATUS_UPDATE):
   * Confirms parts dispatch with CourierPost or Mainfreight tracking details.
   */
  private async executeFulfillmentUpdate(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const payload = (input.payload || {}) as unknown as PartsTraderFulfillmentPayload;
    const orderId = payload.orderId || payload.purchaseOrderId;
    const carrierName = payload.carrierName || 'CourierPost / NZ Post';
    const trackingNumber = payload.trackingNumber?.trim();

    if (!orderId) {
      return {
        success: false,
        isTransient: false,
        error: 'PartsTrader fulfillment update requires orderId or purchaseOrderId.',
      };
    }

    if (!trackingNumber) {
      return {
        success: false,
        isTransient: false,
        error: 'PartsTrader fulfillment update requires a valid shipment tracking number.',
      };
    }

    const syncHash = createHash('sha256')
      .update(JSON.stringify({ orderId, carrierName, trackingNumber }))
      .digest('hex');

    if (this.simulationMode) {
      const simulatedDispatchId = `PT-DISP-${Date.now().toString().slice(-6)}`;
      return {
        success: true,
        externalId: simulatedDispatchId,
        syncHash,
        data: {
          dispatchId: simulatedDispatchId,
          purchaseOrderId: String(orderId),
          carrierName,
          trackingNumber,
          shippedAt: new Date().toISOString(),
          status: 'DISPATCHED',
        },
      };
    }

    const creds = this.resolveCredentials(input.credentials);
    if (!creds) {
      throw new Error('PartsTrader live API call blocked: Unconfigured credentials.');
    }

    const environment = (input.settings?.['environment'] as string) || creds.environment || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.partstrader.co.nz/v1'
        : 'https://sandbox.partstrader.co.nz/api/v1';

    const endpoint = `${baseUrl}/orders/${encodeURIComponent(orderId)}/dispatch`;
    const dispatchBody = {
      purchaseOrderId: String(orderId),
      carrierName,
      trackingNumber,
      shippedDate: payload.shippedDate || new Date().toISOString(),
    };

    await this.callPartsTraderApi(endpoint, 'POST', creds, dispatchBody, correlationId);

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

  /**
   * Quote Response Submission:
   * Submits legally binding parts availability & pricing to PartsTrader RFQ.
   */
  private async executeQuoteSubmission(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const payload = (input.payload || {}) as unknown as PartsTraderQuotePayload;
    const rfqId = payload.quoteRequestId;

    if (!rfqId) {
      return {
        success: false,
        isTransient: false,
        error: 'Quote submission requires quoteRequestId.',
      };
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return {
        success: false,
        isTransient: false,
        error: 'Quote submission requires at least one quote line item.',
      };
    }

    // Validate quote items
    for (const item of payload.items) {
      if (item.available && (item.quotedUnitPrice === undefined || item.quotedUnitPrice <= 0)) {
        return {
          success: false,
          isTransient: false,
          error: `Quoted price for available item "${item.description}" must be greater than $0.00 NZD.`,
        };
      }
    }

    const syncHash = createHash('sha256')
      .update(JSON.stringify({ rfqId, items: payload.items }))
      .digest('hex');

    if (this.simulationMode) {
      const simulatedQuoteId = `PT-QTE-${Date.now().toString().slice(-6)}`;
      return {
        success: true,
        externalId: simulatedQuoteId,
        syncHash,
        data: {
          quoteId: simulatedQuoteId,
          quoteRequestId: rfqId,
          repairerWorkshop: payload.repairerWorkshop,
          quotedItemsCount: payload.items.filter((i) => i.available).length,
          status: 'SUBMITTED',
          currency: 'NZD',
          submittedAt: new Date().toISOString(),
        },
      };
    }

    const creds = this.resolveCredentials(input.credentials);
    if (!creds) {
      throw new Error('PartsTrader live API call blocked: Unconfigured credentials.');
    }

    const environment = (input.settings?.['environment'] as string) || creds.environment || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.partstrader.co.nz/v1'
        : 'https://sandbox.partstrader.co.nz/api/v1';

    const endpoint = `${baseUrl}/quotes/${encodeURIComponent(rfqId)}/respond`;
    await this.callPartsTraderApi(endpoint, 'POST', creds, payload, correlationId);

    return {
      success: true,
      externalId: rfqId,
      syncHash,
      data: {
        quoteRequestId: rfqId,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Manual Batch CSV/JSON Import Workflow:
   * Sanctioned fallback allowing offline PartsTrader portal export files to be ingested.
   */
  private async executeManualBatchImport(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const rawData = input.payload?.['fileContent'] as string;
    if (!rawData) {
      return {
        success: false,
        isTransient: false,
        error: 'Manual batch import requires fileContent string in payload.',
      };
    }

    // Parse simple CSV rows
    const lines = rawData.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) {
      return {
        success: false,
        isTransient: false,
        error: 'Uploaded file must contain at least a header row and one data record.',
      };
    }

    const headers = lines[0]!.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const records: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]!.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = cols[idx] || '';
      });
      records.push(record);
    }

    const syncHash = createHash('sha256').update(rawData).digest('hex');

    this.logger.log(`[PartsTrader] [${correlationId}] Ingested ${records.length} records via manual batch workflow.`);

    return {
      success: true,
      syncHash,
      data: {
        source: 'MANUAL_BATCH_CSV',
        recordCount: records.length,
        processedAt: new Date().toISOString(),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Internal Helpers & Normalizers
  // ---------------------------------------------------------------------------

  private normalizePartsTraderOrder(ptOrder: any): Record<string, unknown> {
    const totalAmount = Number(ptOrder.totalAmount || 0);
    const addr = ptOrder.deliveryAddress || {};

    return {
      externalOrderId: String(ptOrder.purchaseOrderId || ptOrder.quoteRequestId),
      orderSource: 'PARTSTRADER_B2B',
      orderDate: ptOrder.orderDate || new Date().toISOString(),
      paymentStatus: 'PAID', // B2B trade account terms
      fulfillmentStatus: 'UNFULFILLED',
      customerName: ptOrder.repairerName || 'PartsTrader Collision Repairer',
      customerEmail: `trade@${(ptOrder.repairerName || 'repairer').toLowerCase().replace(/[^a-z0-9]/g, '')}.co.nz`,
      shippingAddress: {
        line1: addr.line1 || '18 Industry Road',
        city: addr.city || 'Penrose',
        state: addr.region || 'Auckland',
        postalCode: addr.postcode || '1061',
        country: 'NZ',
      },
      subtotal: totalAmount,
      shippingFee: 0.0,
      totalAmount,
      currency: 'NZD',
      metadata: {
        claimNumber: ptOrder.claimNumber,
        insurer: ptOrder.insurer,
        vehiclePlate: ptOrder.vehicle?.plate,
      },
      items: (ptOrder.items || []).map((item: any) => ({
        externalLineItemId: item.partNumber,
        sku: item.pinnacleSku || item.partNumber,
        title: item.description,
        quantity: item.quantity || 1,
        unitPrice: Number(item.unitPrice || 0),
        totalPrice: Number(item.unitPrice || 0) * (item.quantity || 1),
      })),
    };
  }

  private resolveCredentials(credentials?: Record<string, string>): PartsTraderCredentials | null {
    const supplierId =
      credentials?.['supplierId'] ??
      credentials?.['supplier_id'] ??
      this.config.get<string>('PARTSTRADER_SUPPLIER_ID');

    const apiKey =
      credentials?.['apiKey'] ??
      credentials?.['api_key'] ??
      this.config.get<string>('PARTSTRADER_API_KEY');

    const apiSecret =
      credentials?.['apiSecret'] ??
      credentials?.['api_secret'] ??
      this.config.get<string>('PARTSTRADER_API_SECRET');

    const environment =
      (credentials?.['environment'] as 'sandbox' | 'production') ||
      (this.config.get<string>('PARTSTRADER_ENVIRONMENT') as 'sandbox' | 'production') ||
      'sandbox';

    if (!supplierId || !apiKey) {
      return null;
    }

    return {
      supplierId: supplierId.trim(),
      apiKey: apiKey.trim(),
      apiSecret: apiSecret?.trim(),
      environment,
    };
  }

  private resolveWebhookEntityType(eventType: string): 'PRODUCT' | 'LISTING' | 'CUSTOMER' | 'ORDER' {
    const upper = eventType.toUpperCase();
    if (upper.includes('ORDER') || upper.includes('AWARD') || upper.includes('PO')) return 'ORDER';
    if (upper.includes('QUOTE') || upper.includes('RFQ')) return 'ORDER';
    if (upper.includes('STOCK') || upper.includes('PART')) return 'PRODUCT';
    return 'ORDER';
  }

  private async callPartsTraderApi(
    url: string,
    method: 'GET' | 'POST' | 'PUT',
    creds: PartsTraderCredentials,
    body: unknown,
    correlationId: string,
  ): Promise<unknown> {
    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      try {
        const headers: Record<string, string> = {
          'X-Supplier-Id': creds.supplierId,
          Authorization: `Bearer ${creds.apiKey}`,
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
          throw new Error('PartsTrader API Rate Limit Exceeded (HTTP 429 Too Many Requests)');
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`PartsTrader API error (HTTP ${res.status}): ${errText}`);
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
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isTransient = this.isTransientError(err);
        if (!isTransient || attempt >= this.MAX_RETRIES) {
          throw err;
        }

        const backoffMs = Math.min(1000 * Math.pow(2, attempt + 1) + Math.random() * 200, 5000);
        this.logger.warn(
          `[PartsTrader] [${correlationId}] Retrying transient error (${(err as Error).message}) in ${Math.round(backoffMs)}ms (attempt ${attempt + 1}/${this.MAX_RETRIES})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
    throw new Error(`[PartsTrader] [${correlationId}] Exhausted all retry attempts.`);
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
        `Client-side rate limit reached for PartsTrader API (${this.MAX_REQUESTS_PER_MINUTE} requests/min). Please back off before making further calls.`,
      );
    }

    this.requestTimestamps.push(now);
  }
}

