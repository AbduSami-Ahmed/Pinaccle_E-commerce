import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoSecretsService } from './core/crypto-secrets.service';
import { CarJamAdapter } from './adapters/carjam.adapter';
import { MockVehicleAdapter } from './adapters/mock-vehicle.adapter';
import {
  VehicleLookupQueryDto,
  VehicleLookupResultDto,
  VehicleProviderStatusDto,
  VehicleSelection,
  VEHICLE_FITMENT_DISCLAIMER,
} from '@pinnacle/contracts';
import { VehicleLookupOptions } from './core/vehicle-lookup.interface';

interface CachedVehicleEntry {
  data: VehicleLookupResultDto;
  expiresAt: number;
}

@Injectable()
export class VehicleLookupService {
  private readonly logger = new Logger(VehicleLookupService.name);

  // Technical Vehicle Specification Cache (24-Hour TTL)
  // Caches only non-personal technical specs in accordance with NZTA / CarJam terms
  private readonly vehicleCache = new Map<string, CachedVehicleEntry>();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoSecrets: CryptoSecretsService,
    private readonly carjamAdapter: CarJamAdapter,
    private readonly mockVehicleAdapter: MockVehicleAdapter,
  ) {}

  /**
   * Lookup vehicle by registration plate or VIN.
   */
  async lookupVehicle(query: VehicleLookupQueryDto): Promise<VehicleLookupResultDto> {
    const rawPlate = query.plate?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const rawVin = query.vin?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    const cacheKey = rawPlate ? `plate:${rawPlate}` : `vin:${rawVin}`;

    // 1. Check Technical Cache
    const cached = this.vehicleCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(`[VehicleLookup] Cache hit for ${cacheKey}`);
      return {
        ...cached.data,
        cached: true,
      };
    }

    const options: VehicleLookupOptions = {
      plate: rawPlate,
      vin: rawVin,
      country: query.country || 'NZ',
      correlationId: `lookup-${Date.now()}`,
    };

    // 2. Check for configured CarJam integration account in database
    const carjamAccount = await this.prisma.integrationAccount.findFirst({
      where: {
        provider: 'CARJAM',
        isActive: true,
      },
    });

    let credentials: Record<string, string> | undefined;
    if (
      carjamAccount?.encryptedSecrets &&
      carjamAccount.secretsIv &&
      carjamAccount.secretsTag
    ) {
      try {
        credentials = this.cryptoSecrets.decryptSecrets({
          encryptedData: carjamAccount.encryptedSecrets,
          iv: carjamAccount.secretsIv,
          authTag: carjamAccount.secretsTag,
        });
      } catch (err) {
        this.logger.error(`[VehicleLookup] Failed to decrypt CarJam credentials: ${(err as Error).message}`);
      }
    }

    // Also check environment variable fallback
    if (!credentials && process.env['CARJAM_API_KEY']) {
      credentials = { apiKey: process.env['CARJAM_API_KEY'] };
    }

    let result: import('./core/vehicle-lookup.interface').VehicleLookupExecutionResult;

    // 3. Delegate to appropriate provider adapter
    if (credentials && (await this.carjamAdapter.validateCredentials(credentials))) {
      this.logger.log(`[VehicleLookup] Using live CarJam adapter for query ${cacheKey}`);
      result = await this.carjamAdapter.lookupVehicle(options, credentials);
    } else {
      // Live credentials missing: check if we should fall back to mock or report blocker
      const isDevOrTest =
        process.env['NODE_ENV'] !== 'production' || process.env['ENABLE_MOCK_INTEGRATIONS'] === 'true';

      if (isDevOrTest) {
        this.logger.log(
          `[VehicleLookup] CarJam live credentials missing. Utilizing Mock Vehicle Adapter [TEST HARNESS] for query ${cacheKey}.`,
        );
        result = await this.mockVehicleAdapter.lookupVehicle(options);
      } else {
        // Strict production mode without live credentials
        this.logger.warn(`[VehicleLookup] Live CarJam credentials missing in production. Query ${cacheKey} blocked.`);
        return {
          found: false,
          make: '',
          model: '',
          year: 0,
          providerKey: 'CARJAM',
          sourceAttribution: 'CarJam NZ Transport Agency Motochek Register',
          cached: false,
          disclaimer: VEHICLE_FITMENT_DISCLAIMER,
        };
      }
    }

    if (!result.success || !result.found || !result.data) {
      return {
        found: false,
        plate: rawPlate,
        vin: rawVin,
        make: '',
        model: '',
        year: 0,
        providerKey: result.sourceAttribution.includes('Mock') ? 'MOCK_VEHICLE_DATA' : 'CARJAM',
        sourceAttribution: result.sourceAttribution,
        cached: false,
        disclaimer: VEHICLE_FITMENT_DISCLAIMER,
      };
    }

    // 4. Match with internal vehicle taxonomy
    const matched = await this.matchInternalTaxonomy(result.data);

    const response: VehicleLookupResultDto = {
      found: true,
      plate: result.data.plate,
      vin: result.data.vin,
      make: result.data.make,
      model: result.data.model,
      submodel: result.data.submodel,
      year: result.data.year,
      chassisCode: result.data.chassisCode,
      bodyType: result.data.bodyType,
      engineSpec: result.data.engineSpec,
      ccRating: result.data.ccRating,
      fuelType: result.data.fuelType,
      transmission: result.data.transmission,
      color: result.data.color,
      providerKey: result.sourceAttribution.includes('Mock') ? 'MOCK_VEHICLE_DATA' : 'CARJAM',
      sourceAttribution: result.sourceAttribution,
      cached: false,
      cachedAt: new Date().toISOString(),
      disclaimer: VEHICLE_FITMENT_DISCLAIMER,
      matchedChassisId: matched.matchedChassisId,
      matchedSelection: matched.matchedSelection,
    };

    // 5. Cache technical specification
    this.vehicleCache.set(cacheKey, {
      data: response,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return response;
  }

  /**
   * Diagnostic status of vehicle data provider integration.
   */
  async getProviderStatus(): Promise<VehicleProviderStatusDto> {
    const carjamAccount = await this.prisma.integrationAccount.findFirst({
      where: { provider: 'CARJAM' },
    });

    const isLiveConfigured =
      Boolean(carjamAccount?.encryptedSecrets) || Boolean(process.env['CARJAM_API_KEY']);

    let status: 'CONNECTED' | 'DISCONNECTED' | 'BLOCKED_MISSING_CREDENTIALS' = 'BLOCKED_MISSING_CREDENTIALS';
    let blockerReason: string | null =
      'No active commercial API key configured for CarJam NZTA MVR gateway. Configure CARJAM_API_KEY to activate live plate lookups.';

    if (isLiveConfigured) {
      status = 'CONNECTED';
      blockerReason = null;
    } else if (carjamAccount?.status === 'DISCONNECTED') {
      status = 'DISCONNECTED';
      blockerReason = carjamAccount.lastError || blockerReason;
    }

    return {
      provider: 'CARJAM',
      displayName: 'CarJam Vehicle Data NZ (NZTA Motochek)',
      isMock: false,
      status,
      isLiveConfigured,
      blockerReason,
      officialDocumentationUrl: 'https://www.carjam.co.nz/api/docs/',
      endpointUrl: isLiveConfigured ? 'https://test.carjam.co.nz/api/car/' : 'N/A (Credentials Missing)',
      hasCachedData: this.vehicleCache.size > 0,
      cacheTtlHours: 24,
    };
  }

  /**
   * Clear in-memory vehicle cache (useful for testing or cache refresh).
   */
  clearCache(): void {
    this.vehicleCache.clear();
  }

  /**
   * Match normalized vehicle data with local vehicle database taxonomy.
   */
  private async matchInternalTaxonomy(
    v: import('./core/vehicle-lookup.interface').NormalizedVehicleData,
  ): Promise<{ matchedChassisId?: string; matchedSelection?: VehicleSelection }> {
    try {
      const makeRecord = await this.prisma.vehicleMake.findFirst({
        where: {
          OR: [
            { name: { equals: v.make, mode: 'insensitive' } },
            { slug: { equals: v.make.toLowerCase() } },
          ],
        },
      });

      if (!makeRecord) {
        return {
          matchedSelection: {
            make: v.make,
            model: v.model,
            year: v.year,
            chassisCode: v.chassisCode,
          },
        };
      }

      const modelRecord = await this.prisma.vehicleModel.findFirst({
        where: {
          makeId: makeRecord.id,
          OR: [
            { name: { equals: v.model, mode: 'insensitive' } },
            { slug: { equals: v.model.toLowerCase() } },
          ],
        },
      });

      if (!modelRecord) {
        return {
          matchedSelection: {
            make: makeRecord.name,
            model: v.model,
            year: v.year,
            chassisCode: v.chassisCode,
          },
        };
      }

      // Find generation covering year
      const generation = await this.prisma.vehicleGeneration.findFirst({
        where: {
          modelId: modelRecord.id,
          yearStart: { lte: v.year },
          OR: [{ yearEnd: null }, { yearEnd: { gte: v.year } }],
        },
        include: {
          chassis: true,
        },
      });

      if (!generation) {
        return {
          matchedSelection: {
            make: makeRecord.name,
            model: modelRecord.name,
            year: v.year,
            chassisCode: v.chassisCode,
          },
        };
      }

      // Find chassis by chassisCode or take first variant of generation
      let chassis = generation.chassis.find(
        (c) => v.chassisCode && c.chassisCode.toUpperCase() === v.chassisCode.toUpperCase(),
      );

      if (!chassis && generation.chassis.length > 0) {
        chassis = generation.chassis[0];
      }

      return {
        matchedChassisId: chassis?.id,
        matchedSelection: {
          make: makeRecord.name,
          model: modelRecord.name,
          year: v.year,
          chassisId: chassis?.id,
          chassisCode: chassis?.chassisCode || v.chassisCode,
          bodyType: chassis?.bodyType || v.bodyType,
          engineSpec: chassis?.engineSpec || v.engineSpec,
        },
      };
    } catch (err) {
      this.logger.warn(`[VehicleLookup] Error matching taxonomy: ${(err as Error).message}`);
      return {
        matchedSelection: {
          make: v.make,
          model: v.model,
          year: v.year,
          chassisCode: v.chassisCode,
        },
      };
    }
  }
}

