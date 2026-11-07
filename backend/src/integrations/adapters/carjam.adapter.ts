import { Injectable, Logger } from '@nestjs/common';
import {
  IntegrationProviderAdapter,
  SyncJobExecutionInput,
  SyncJobExecutionResult,
  WebhookVerificationResult,
  InternalIntegrationCommand,
} from '../core/integration-adapter.interface';
import {
  VehicleLookupAdapter,
  VehicleLookupOptions,
  VehicleLookupExecutionResult,
  NormalizedVehicleData,
} from '../core/vehicle-lookup.interface';
import { IntegrationCapability, VEHICLE_FITMENT_DISCLAIMER } from '@pinnacle/contracts';

export interface CarJamRawResponse {
  make?: string;
  model?: string;
  submodel?: string;
  year_of_manufacture?: number | string;
  vin?: string;
  chassis?: string;
  engine_no?: string;
  cc_rating?: number | string;
  fuel_type?: string;
  body_style?: string;
  transmission_type?: string;
  main_colour?: string;
  assembly_type?: string;
  country_of_origin?: string;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * CarJam Vehicle Data Provider Adapter (New Zealand Transport Agency MVR)
 *
 * Implements official CarJam REST API integration for license plate and VIN lookups.
 * Governing rules:
 *   - Strictly uses official documented endpoints (https://test.carjam.co.nz or https://www.carjam.co.nz).
 *   - Prohibits scraping or undocumented parameter usage.
 *   - If API credentials are missing, reports blocker and makes zero network calls.
 *   - Enforces rate limiting, 5000ms timeouts, and exponential backoff retry.
 *   - Never claims vehicle lookup guarantees exact part fitment.
 *   - Attaches official data-source attribution on all outputs.
 */
@Injectable()
export class CarJamAdapter implements IntegrationProviderAdapter, VehicleLookupAdapter {
  readonly providerKey = 'CARJAM';
  readonly displayName = 'CarJam Vehicle Data NZ';
  readonly isMock = false;
  readonly capabilities: IntegrationCapability[] = ['VEHICLE_FITMENT_QUERY'];

  private readonly logger = new Logger(CarJamAdapter.name);

  // Rate Limiting Tracker (Sliding 60-second window, default 60 req/min)
  private readonly requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly TIMEOUT_MS = 5000;
  private readonly MAX_RETRIES = 2;

  // Official Endpoints
  private readonly SANDBOX_URL = 'https://test.carjam.co.nz/api/car/';
  private readonly PRODUCTION_URL = 'https://www.carjam.co.nz/api/car/';

  /**
   * Validate that credentials contain required CarJam API key.
   */
  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    if (!credentials) return false;
    const apiKey = credentials['apiKey'] || credentials['key'] || credentials['api_key'];
    return typeof apiKey === 'string' && apiKey.trim().length >= 8;
  }

  async verifyWebhookSignature(
    _payload: string | Buffer,
    _headers: Record<string, string | string[] | undefined>,
    _secret: string,
  ): Promise<WebhookVerificationResult> {
    // CarJam vehicle lookup is a synchronous query API, not an inbound webhook source
    return { isValid: true };
  }

  transformInboundWebhook(
    rawPayload: any,
    _headers: Record<string, string | string[] | undefined>,
    correlationId: string,
  ): InternalIntegrationCommand {
    return {
      eventType: 'carjam.vehicle.query',
      externalId: rawPayload.plate || 'UNKNOWN_PLATE',
      entityType: 'PRODUCT',
      correlationId,
      payload: rawPayload,
      syncHash: 'carjam-query',
    };
  }

  async executeSync(input: SyncJobExecutionInput): Promise<SyncJobExecutionResult> {
    if (input.jobType === 'VEHICLE_LOOKUP') {
      const plate = (input.payload?.['plate'] as string) || '';
      const vin = (input.payload?.['vin'] as string) || '';
      const result = await this.lookupVehicle({ plate, vin }, input.credentials);
      return {
        success: result.success,
        data: (result.data as unknown as Record<string, unknown>) || {},
        error: result.error,
        isTransient: result.isTransient,
      };
    }

    return {
      success: true,
      data: { message: 'CarJam adapter sync completed' },
    };
  }

  /**
   * Query CarJam API for vehicle specifications by registration plate or VIN.
   */
  async lookupVehicle(
    options: VehicleLookupOptions,
    credentials?: Record<string, string>,
  ): Promise<VehicleLookupExecutionResult> {
    const rawPlate = options.plate?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const rawVin = options.vin?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const correlationId = options.correlationId || `carjam-${Date.now()}`;

    if (!rawPlate && !rawVin) {
      return {
        success: false,
        found: false,
        error: 'Either registration plate or VIN must be provided for vehicle lookup.',
        sourceAttribution: 'CarJam NZ Transport Agency Motochek Register',
        disclaimer: VEHICLE_FITMENT_DISCLAIMER,
      };
    }

    // 1. Verify credentials presence before making any outbound call
    const apiKey =
      credentials?.['apiKey'] ||
      credentials?.['key'] ||
      credentials?.['api_key'] ||
      process.env['CARJAM_API_KEY'];

    if (!apiKey || apiKey.trim().length < 8) {
      this.logger.warn(
        `[CarJam] [${correlationId}] Live vehicle lookup blocked: CARJAM_API_KEY is not configured.`,
      );
      return {
        success: false,
        found: false,
        isBlocked: true,
        blockerReason:
          'Missing CarJam API credentials. Configure an active commercial API key in Integrations Settings or CARJAM_API_KEY environment variable to enable live NZTA MVR lookups.',
        sourceAttribution: 'CarJam NZ Transport Agency Motochek Register',
        disclaimer: VEHICLE_FITMENT_DISCLAIMER,
      };
    }

    // 2. Check Client-Side Rate Limit
    if (!this.checkRateLimit()) {
      this.logger.warn(`[CarJam] [${correlationId}] Client-side rate limit reached (60 req/min).`);
      return {
        success: false,
        found: false,
        isTransient: true,
        statusCode: 429,
        error: 'CarJam client-side rate limit exceeded. Please retry after 1 minute.',
        sourceAttribution: 'CarJam NZ Transport Agency Motochek Register',
        disclaimer: VEHICLE_FITMENT_DISCLAIMER,
      };
    }

    // 3. Resolve Endpoint (Default to sandbox if environment is sandbox or test key)
    const environment =
      credentials?.['environment'] || process.env['CARJAM_ENVIRONMENT'] || 'sandbox';
    const baseUrl =
      environment.toLowerCase() === 'production' ? this.PRODUCTION_URL : this.SANDBOX_URL;

    const url = new URL(baseUrl);
    url.searchParams.set('f', 'json');
    url.searchParams.set('key', apiKey.trim());
    if (rawPlate) url.searchParams.set('plate', rawPlate);
    if (rawVin) url.searchParams.set('vin', rawVin);

    // 4. Execute with Timeout and Exponential Backoff Retries
    return await this.executeWithRetry(url, rawPlate, rawVin, correlationId);
  }

  /**
   * Execute HTTP request with AbortSignal timeout and exponential backoff retry.
   */
  private async executeWithRetry(
    url: URL,
    plate?: string,
    vin?: string,
    correlationId?: string,
  ): Promise<VehicleLookupExecutionResult> {
    let lastError = '';
    let lastStatus = 0;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // Exponential backoff with jitter: 300ms, 900ms
        const delayMs = Math.min(300 * Math.pow(3, attempt - 1) + Math.random() * 100, 3000);
        this.logger.log(
          `[CarJam] [${correlationId}] Retrying vehicle query after ${Math.round(delayMs)}ms (attempt ${attempt}/${this.MAX_RETRIES})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Pinnacle-Automotive/1.0 (Prestons NSW; contact@pinnacle.com.au)',
          },
          signal: controller.signal,
        });

        clearTimeout(timer);
        lastStatus = response.status;

        // 404 / 400 Vehicle Not Found
        if (response.status === 404) {
          return {
            success: true,
            found: false,
            sourceAttribution: 'CarJam NZ Transport Agency Motochek Register',
            disclaimer: VEHICLE_FITMENT_DISCLAIMER,
          };
        }

        // 401 / 403 Authentication failure — non-transient, fail immediately
        if (response.status === 401 || response.status === 403) {
          const errText = await response.text().catch(() => '');
          this.logger.error(
            `[CarJam] [${correlationId}] Authentication failed (HTTP ${response.status}): ${errText}`,
          );
          return {
            success: false,
            found: false,
            isBlocked: true,
            statusCode: response.status,
            blockerReason: `Invalid CarJam API credentials or unauthorized IP (HTTP ${response.status}).`,
            sourceAttribution: 'CarJam NZ Transport Agency Motochek Register',
            disclaimer: VEHICLE_FITMENT_DISCLAIMER,
          };
        }

        // 429 Too Many Requests — transient rate limit
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          return {
            success: false,
            found: false,
            isTransient: true,
            statusCode: 429,
            error: `CarJam API rate limit exceeded. Retry after ${retryAfter || '60'} seconds.`,
            sourceAttribution: 'CarJam NZ Transport Agency Motochek Register',
            disclaimer: VEHICLE_FITMENT_DISCLAIMER,
          };
        }

        // 5xx Server Error — transient, candidate for retry
        if (response.status >= 500) {
          lastError = `CarJam provider returned HTTP ${response.status}`;
          continue;
        }

        // Success 200 OK
        if (response.ok) {
          const rawData = (await response.json()) as CarJamRawResponse;

          // Check if payload indicates vehicle not found in JSON body
          if (rawData.error || !rawData.make) {
            return {
              success: true,
              found: false,
              sourceAttribution: 'CarJam NZ Transport Agency Motochek Register',
              disclaimer: VEHICLE_FITMENT_DISCLAIMER,
            };
          }

          const normalized = this.normalizeCarJamPayload(rawData, plate, vin);
          return {
            success: true,
            found: true,
            data: normalized,
            rawAttributes: {
              submodel: rawData.submodel,
              assembly_type: rawData.assembly_type,
              country_of_origin: rawData.country_of_origin,
            },
            sourceAttribution: 'CarJam NZ Transport Agency Motochek Register',
            disclaimer: VEHICLE_FITMENT_DISCLAIMER,
          };
        }
      } catch (err) {
        clearTimeout(timer);
        const error = err as Error;
        if (error.name === 'AbortError') {
          lastError = `CarJam query timed out after ${this.TIMEOUT_MS}ms.`;
        } else {
          lastError = `Network connection failure: ${error.message}`;
        }
      }
    }

    return {
      success: false,
      found: false,
      isTransient: true,
      statusCode: lastStatus || 504,
      error: lastError || 'Failed to communicate with CarJam API after multiple attempts.',
      sourceAttribution: 'CarJam NZ Transport Agency Motochek Register',
      disclaimer: VEHICLE_FITMENT_DISCLAIMER,
    };
  }

  /**
   * Normalize CarJam-specific raw fields into our internal canonical vehicle model.
   */
  normalizeCarJamPayload(
    raw: CarJamRawResponse,
    plate?: string,
    vin?: string,
  ): NormalizedVehicleData {
    const formatName = (str?: string) => {
      if (!str) return '';
      return str
        .toLowerCase()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    };

    const year = Number(raw.year_of_manufacture) || new Date().getFullYear();
    const make = formatName(raw.make);
    const model = (raw.model || '').toUpperCase();
    const submodel = raw.submodel?.trim();
    const chassisCode = (raw.chassis || '').toUpperCase().trim();
    const bodyType = formatName(raw.body_style);
    const ccRating = Number(raw.cc_rating) || undefined;
    const engineSpec = raw.engine_no ? `Engine #${raw.engine_no}` : undefined;
    const fuelType = formatName(raw.fuel_type);
    const transmission = formatName(raw.transmission_type);
    const color = formatName(raw.main_colour);

    return {
      make,
      model,
      submodel,
      year,
      chassisCode: chassisCode || undefined,
      bodyType: bodyType || undefined,
      engineSpec,
      ccRating,
      fuelType: fuelType || undefined,
      transmission: transmission || undefined,
      color: color || undefined,
      vin: (raw.vin || vin || '').toUpperCase() || undefined,
      plate: (plate || '').toUpperCase() || undefined,
    };
  }

  /**
   * Enforce sliding window rate limit of 60 req/min.
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Prune entries older than 60 seconds
    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0]! < oneMinuteAgo) {
      this.requestTimestamps.shift();
    }

    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }

    this.requestTimestamps.push(now);
    return true;
  }
}

