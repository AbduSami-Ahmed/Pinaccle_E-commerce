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
 * CAP EZI (INFOMEDIA) ADAPTER — FIELD MAPPING & OWNERSHIP SPECIFICATION
 * =============================================================================
 *
 * 1. Scope & Provider Context:
 *    - Platform: Infomedia / CAP Ezi (CAP-Link / EziParts Australasia)
 *    - Purpose: Automotive OEM parts catalogue, supersession chain resolution,
 *      vehicle fitment verification, and parts interchange indexing.
 *    - Direction: INBOUND ONLY (Reference Data Provider).
 *      Pinnacle consumes catalog/fitment data to index stock and cross-reference
 *      interchangeable OEM numbers. Pinnacle does NOT publish inventory or orders
 *      to CAP Ezi.
 *    - IP & Contractual Terms:
 *      * Licensed enterprise data catalog. Redistribution or resale is strictly prohibited.
 *      * Zero scraping: Scraping web portals or unauthorized extraction is contractually
 *        forbidden. All operations must use sanctioned enterprise REST APIs or client-provided
 *        batch export files.
 *
 * 2. Supported Capabilities:
 *    - VEHICLE_FITMENT_QUERY: Query fitment tree (make/model/year/engine) by OEM part number.
 *    - INVENTORY_SYNC_INBOUND: Ingest official catalog delta feed or batch interchange export
 *      to maintain Pinnacle's local OEM supersession & interchange index.
 *
 * 3. Field Mapping & Ownership:
 *    - OEM Part Number: Owner = Vehicle Manufacturer (OEM)
 *    - Superseded / Alternate Part Numbers: Owner = CAP Ezi / OEM
 *    - Vehicle Fitment Hierarchy (Make/Model/Year/Trim): Owner = CAP Ezi
 *    - Pinnacle Internal SKU & Stock Level: Owner = Pinnacle
 * =============================================================================
 */

export interface CapEziCredentials {
  clientId: string;
  apiKey: string;
  apiSecret?: string;
  environment?: 'sandbox' | 'production';
}

export interface CapEziFitmentQueryPayload {
  oemPartNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  engineCode?: string;
  vin?: string;
}

export interface CapEziInterchangeRecord {
  oemPartNumber: string;
  supersededPartNumbers: string[];
  interchangeGroupCode: string;
  partDescription: string;
  applicableMakes: string[];
  applicableModels: string[];
  yearFrom: number;
  yearTo: number;
  engineCodes?: string[];
  transmission?: string;
  notes?: string;
}

@Injectable()
export class CapEziAdapter implements IntegrationProviderAdapter {
  readonly providerKey = 'CAP_EZI';
  readonly displayName = 'CAP Ezi Parts & Interchange Catalogue';
  readonly isMock = false;

  readonly capabilities: IntegrationCapability[] = [
    'VEHICLE_FITMENT_QUERY',
    'INVENTORY_SYNC_INBOUND',
  ];

  private readonly logger = new Logger(CapEziAdapter.name);

  // Rate Limiting Tracker (Sliding window: default 120 req/min for catalog fitment queries)
  private readonly requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS_PER_MINUTE = 120;
  private readonly TIMEOUT_MS = 8000;
  private readonly MAX_RETRIES = 2;

  // Simulation mode for deterministic CI/CD testing and uncredentialed local development
  private simulationMode = false;
  private simulatedTransientFailure = false;
  private simulatedRateLimitFailure = false;

  constructor(private readonly config: ConfigService) {}

  /**
   * Toggle simulation mode for automated testing without live CAP Ezi network requests.
   */
  setSimulationMode(enabled: boolean): void {
    this.simulationMode = enabled;
  }

  setSimulatedTransientFailure(enabled: boolean): void {
    this.simulatedTransientFailure = enabled;
  }

  setSimulatedRateLimitFailure(enabled: boolean): void {
    this.simulatedRateLimitFailure = enabled;
  }

  // ---------------------------------------------------------------------------
  // 1. Credential Validation
  // ---------------------------------------------------------------------------

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    const creds = this.resolveCredentials(credentials);
    if (!creds) {
      return false;
    }

    // Minimum structural validation
    if (creds.clientId.length < 3 || creds.apiKey.length < 8) {
      return false;
    }

    if (this.simulationMode) {
      return true;
    }

    try {
      const baseUrl =
        creds.environment === 'production'
          ? 'https://api.capezi.infomedia.com.au/v2'
          : 'https://sandbox.capezi.infomedia.com.au/v2';

      const res = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: {
          'X-Client-Id': creds.clientId,
          Authorization: `Bearer ${creds.apiKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });

      return res.ok || res.status === 200;
    } catch (err) {
      this.logger.warn(`CAP Ezi credential validation failed network check: ${(err as Error).message}`);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Webhook & Catalog Delta Notification Ingestion
  // ---------------------------------------------------------------------------

  async verifyWebhookSignature(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string,
  ): Promise<WebhookVerificationResult> {
    const signatureHeader =
      headers['x-capezi-signature'] ||
      headers['x-infomedia-signature'] ||
      headers['x-signature'];

    const timestampHeader =
      headers['x-capezi-timestamp'] ||
      headers['x-timestamp'];

    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const timestampStr = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader;

    if (!signature) {
      return {
        isValid: false,
        failureReason: 'Missing X-CAPEZi-Signature or X-Infomedia-Signature header in catalog notification.',
      };
    }

    const rawBody = typeof payload === 'string' ? payload : payload.toString('utf8');

    let timestamp: number | undefined;
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
            failureReason: `Catalog notification timestamp outside acceptable 5-minute replay window (drift: ${Math.abs(currentUnix - timestamp)}s).`,
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
          failureReason: 'Cryptographic HMAC signature mismatch against configured CAP Ezi secret.',
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
      'CAP_EZI_CATALOG_DELTA';

    const externalId =
      rawPayload.feedId ||
      rawPayload.catalogVersion ||
      rawPayload.id ||
      `capezi_feed_${Date.now()}`;

    const syncHash = createHash('sha256')
      .update(JSON.stringify(rawPayload.data || rawPayload))
      .digest('hex');

    return {
      eventType,
      externalId: String(externalId),
      entityType: 'PRODUCT',
      correlationId,
      payload: rawPayload.data || rawPayload,
      syncHash,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Sync Job Execution Dispatcher
  // ---------------------------------------------------------------------------

  async executeSync(input: SyncJobExecutionInput): Promise<SyncJobExecutionResult> {
    const correlationId = input.correlationId || `capezi-sync-${Date.now()}`;

    if (this.simulatedRateLimitFailure) {
      return {
        success: false,
        isTransient: true,
        error: 'CAP Ezi API Rate Limit Exceeded: HTTP 429 Too Many Requests (Simulated Backoff Trigger)',
      };
    }

    if (this.simulatedTransientFailure) {
      return {
        success: false,
        isTransient: true,
        error: 'CAP Ezi Gateway Timeout: HTTP 504 (Simulated Transient Failure)',
      };
    }

    try {
      this.enforceRateLimit();

      switch (input.jobType) {
        case 'VEHICLE_FITMENT_QUERY':
        case 'FITMENT_LOOKUP':
        case 'PART_INTERCHANGE_QUERY':
          return await this.executeFitmentLookup(input, correlationId);

        case 'INVENTORY_SYNC_INBOUND':
        case 'INTERCHANGE_FEED_IMPORT':
        case 'MANUAL_BATCH_IMPORT':
          return await this.executeInterchangeFeedImport(input, correlationId);

        default:
          return {
            success: true,
            data: {
              message: `CAP Ezi adapter received unhandled jobType "${input.jobType}". Acknowledged without action.`,
            },
          };
      }
    } catch (err) {
      const errorMsg = (err as Error).message || 'Unknown CAP Ezi sync error';
      const isTransient = this.isTransientError(err);

      this.logger.error(`[CAP Ezi] [${correlationId}] Sync job failed: ${errorMsg}`, (err as Error).stack);

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
   * Fitment & Interchange Query (VEHICLE_FITMENT_QUERY):
   * Queries OEM supersessions and compatible vehicle trees for an OEM part number.
   */
  private async executeFitmentLookup(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const payload = (input.payload || {}) as unknown as CapEziFitmentQueryPayload;
    const oemPartNumber = payload.oemPartNumber?.trim();

    if (!oemPartNumber && !payload.vin) {
      return {
        success: false,
        isTransient: false,
        error: 'CAP Ezi fitment lookup requires either oemPartNumber or vin.',
      };
    }

    const syncHash = createHash('sha256')
      .update(JSON.stringify({ oemPartNumber, vin: payload.vin }))
      .digest('hex');

    if (this.simulationMode) {
      const simulatedData = this.buildSimulatedFitment(oemPartNumber || 'DEFAULT_PART');
      return {
        success: true,
        externalId: oemPartNumber || payload.vin,
        syncHash,
        data: simulatedData,
      };
    }

    const creds = this.resolveCredentials(input.credentials);
    if (!creds) {
      throw new Error(
        'CAP Ezi live API call blocked: Unconfigured credentials. Configure CAP_EZI_CLIENT_ID and CAP_EZI_API_KEY in Integration Settings.',
      );
    }

    const environment = (input.settings?.['environment'] as string) || creds.environment || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? 'https://api.capezi.infomedia.com.au/v2'
        : 'https://sandbox.capezi.infomedia.com.au/v2';

    const url = oemPartNumber
      ? `${baseUrl}/parts/${encodeURIComponent(oemPartNumber)}/fitment`
      : `${baseUrl}/vehicles/${encodeURIComponent(payload.vin!)}/parts`;

    const res = (await this.callCapEziApi(url, 'GET', creds, undefined, correlationId)) as Record<string, unknown>;

    return {
      success: true,
      externalId: oemPartNumber || payload.vin,
      syncHash,
      data: res,
    };
  }

  /**
   * Batch Interchange Feed Import (INVENTORY_SYNC_INBOUND / MANUAL_BATCH_IMPORT):
   * Ingests sanctioned CSV or JSON interchange feeds to update local OEM cross-reference mappings.
   */
  private async executeInterchangeFeedImport(
    input: SyncJobExecutionInput,
    correlationId: string,
  ): Promise<SyncJobExecutionResult> {
    const rawData = input.payload?.['fileContent'] as string;
    if (!rawData) {
      return {
        success: false,
        isTransient: false,
        error: 'Interchange feed import requires fileContent string in payload.',
      };
    }

    // Parse CSV records
    const lines = rawData.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) {
      return {
        success: false,
        isTransient: false,
        error: 'Uploaded interchange feed must contain at least a header row and one data record.',
      };
    }

    const headers = lines[0]!.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const records: CapEziInterchangeRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]!.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] || '';
      });

      const oemPartNumber = row['oemPartNumber'] || row['partNumber'] || row['oem_part_number'];
      if (!oemPartNumber) continue;

      const supersededRaw = row['supersededPartNumbers'] || row['superseded'] || row['supersessions'] || '';
      const supersededPartNumbers = supersededRaw
        ? supersededRaw.split(';').map((s) => s.trim()).filter(Boolean)
        : [];

      const record: CapEziInterchangeRecord = {
        oemPartNumber,
        supersededPartNumbers,
        interchangeGroupCode: row['interchangeGroupCode'] || row['groupCode'] || `GRP-${oemPartNumber}`,
        partDescription: row['partDescription'] || row['description'] || 'Automotive Component',
        applicableMakes: (row['applicableMakes'] || row['make'] || '')
          .split(';')
          .map((m) => m.trim())
          .filter(Boolean),
        applicableModels: (row['applicableModels'] || row['model'] || '')
          .split(';')
          .map((m) => m.trim())
          .filter(Boolean),
        yearFrom: parseInt(row['yearFrom'] || '2000', 10),
        yearTo: parseInt(row['yearTo'] || new Date().getFullYear().toString(), 10),
        engineCodes: (row['engineCodes'] || row['engine'] || '')
          .split(';')
          .map((e) => e.trim())
          .filter(Boolean),
        notes: row['notes'] || undefined,
      };

      records.push(record);
    }

    const syncHash = createHash('sha256').update(rawData).digest('hex');

    this.logger.log(`[CAP Ezi] [${correlationId}] Ingested ${records.length} interchange records.`);

    return {
      success: true,
      syncHash,
      data: {
        source: 'CAP_EZI_SANCTIONED_BATCH_FEED',
        recordCount: records.length,
        processedAt: new Date().toISOString(),
        disclaimer: 'CAP Ezi proprietary interchange data for Pinnacle internal fitment indexing only. Redistribution prohibited.',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Internal Helpers & Normalizers
  // ---------------------------------------------------------------------------

  private buildSimulatedFitment(partNumber: string): Record<string, unknown> {
    return {
      oemPartNumber: partNumber,
      primaryDescription: 'Seat Belt Tensioner Assembly & Pre-tensioner Unit',
      category: 'Safety & Restraints',
      supersessionChain: [
        { revision: 1, partNumber: `${partNumber}-REV1`, status: 'SUPERSEDED' },
        { revision: 2, partNumber: `${partNumber}-REV2`, status: 'SUPERSEDED' },
        { revision: 3, partNumber: partNumber, status: 'CURRENT_OEM' },
      ],
      interchangeGroupCode: 'IC-TOY-RAV-8820',
      compatibleVehicles: [
        {
          make: 'Toyota',
          model: 'RAV4',
          series: 'XA50',
          yearFrom: 2019,
          yearTo: 2024,
          chassisCode: 'AXAH54',
          engineCode: 'A25A-FXS (2.5L Hybrid)',
          notes: 'Right-hand drive New Zealand specification.',
        },
        {
          make: 'Toyota',
          model: 'Harrier',
          series: 'XU80',
          yearFrom: 2020,
          yearTo: 2024,
          chassisCode: 'AXUH85',
          engineCode: 'A25A-FXS',
          notes: 'Japanese import parallel fitment verified.',
        },
      ],
      benchmarkPriceReferenceNZD: {
        listPrice: 520.0,
        currency: 'NZD',
        gstInclusive: true,
      },
      licensingDisclaimer: 'CAP Ezi (Infomedia) proprietary data. Strictly for Pinnacle internal fitment resolution.',
    };
  }

  private resolveCredentials(credentials?: Record<string, string>): CapEziCredentials | null {
    const clientId =
      credentials?.['clientId'] ??
      credentials?.['client_id'] ??
      this.config.get<string>('CAP_EZI_CLIENT_ID');

    const apiKey =
      credentials?.['apiKey'] ??
      credentials?.['api_key'] ??
      this.config.get<string>('CAP_EZI_API_KEY');

    const apiSecret =
      credentials?.['apiSecret'] ??
      credentials?.['api_secret'] ??
      this.config.get<string>('CAP_EZI_API_SECRET');

    const environment =
      (credentials?.['environment'] as 'sandbox' | 'production') ||
      (this.config.get<string>('CAP_EZI_ENVIRONMENT') as 'sandbox' | 'production') ||
      'sandbox';

    if (!clientId || !apiKey) {
      return null;
    }

    return {
      clientId: clientId.trim(),
      apiKey: apiKey.trim(),
      apiSecret: apiSecret?.trim(),
      environment,
    };
  }

  private async callCapEziApi(
    url: string,
    method: 'GET' | 'POST',
    creds: CapEziCredentials,
    body: unknown,
    correlationId: string,
  ): Promise<unknown> {
    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      try {
        const headers: Record<string, string> = {
          'X-Client-Id': creds.clientId,
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
          throw new Error('CAP Ezi API Rate Limit Exceeded (HTTP 429 Too Many Requests)');
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`CAP Ezi API error (HTTP ${res.status}): ${errText}`);
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
          `[CAP Ezi] [${correlationId}] Retrying transient error (${(err as Error).message}) in ${Math.round(backoffMs)}ms (attempt ${attempt + 1}/${this.MAX_RETRIES})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
    throw new Error(`[CAP Ezi] [${correlationId}] Exhausted all retry attempts.`);
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
        `Client-side rate limit reached for CAP Ezi API (${this.MAX_REQUESTS_PER_MINUTE} requests/min). Please back off before making further calls.`,
      );
    }

    this.requestTimestamps.push(now);
  }
}

