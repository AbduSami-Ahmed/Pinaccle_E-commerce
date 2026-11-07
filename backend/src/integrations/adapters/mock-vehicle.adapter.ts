import { Injectable } from '@nestjs/common';
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
} from '../core/vehicle-lookup.interface';
import { IntegrationCapability, VEHICLE_FITMENT_DISCLAIMER } from '@pinnacle/contracts';

/**
 * Mock Vehicle Data Provider Adapter
 *
 * UNMISTAKABLY LABELED AS A TEST HARNESS.
 * Used for automated CI testing and local developer workflows when live
 * vehicle registry credentials (e.g. CarJam / NZTA) are not provisioned.
 */
@Injectable()
export class MockVehicleAdapter implements IntegrationProviderAdapter, VehicleLookupAdapter {
  readonly providerKey = 'MOCK_VEHICLE_DATA';
  readonly displayName = 'Mock Vehicle Data Provider [TEST HARNESS - DO NOT USE IN PRODUCTION]';
  readonly isMock = true;
  readonly capabilities: IntegrationCapability[] = ['VEHICLE_FITMENT_QUERY'];

  private readonly mockVehiclesByPlate: Record<
    string,
    {
      make: string;
      model: string;
      submodel: string;
      year: number;
      chassisCode: string;
      bodyType: string;
      engineSpec: string;
      ccRating: number;
      fuelType: string;
      transmission: string;
      color: string;
      vin: string;
    }
  > = {
    HYP360: {
      make: 'Toyota',
      model: 'RAV4',
      submodel: 'GXL 2.5P Hybrid AWD',
      year: 2021,
      chassisCode: 'AXAH54',
      bodyType: 'SUV 5-Door',
      engineSpec: '2.5L Hybrid (A25A-FXS)',
      ccRating: 2487,
      fuelType: 'Petrol / Electric Hybrid',
      transmission: 'eCVT Electronic',
      color: 'Glacier White',
      vin: 'JTMK43FV50D192834',
    },
    NZT442: {
      make: 'Ford',
      model: 'Ranger',
      submodel: 'Wildtrak Double Cab 4x4',
      year: 2020,
      chassisCode: 'PX3',
      bodyType: 'Dual Cab Ute',
      engineSpec: '3.2L TDCi Duratorq',
      ccRating: 3198,
      fuelType: 'Diesel',
      transmission: '6-Speed Automatic',
      color: 'Meteor Grey',
      vin: 'MNBUMFF50LW716254',
    },
    WRX004: {
      make: 'Subaru',
      model: 'WRX',
      submodel: 'STI Premium AWD',
      year: 2018,
      chassisCode: 'VA',
      bodyType: 'Sedan 4-Door',
      engineSpec: '2.5L Turbo Boxer (EJ257)',
      ccRating: 2457,
      fuelType: 'Premium Unleaded Petrol',
      transmission: '6-Speed Manual',
      color: 'World Rally Blue',
      vin: 'JF1VAGH50J8271923',
    },
  };

  async validateCredentials(_credentials: Record<string, string>): Promise<boolean> {
    // Mock harness always accepts credentials in test mode
    return true;
  }

  async verifyWebhookSignature(
    _payload: string | Buffer,
    _headers: Record<string, string | string[] | undefined>,
    _secret: string,
  ): Promise<WebhookVerificationResult> {
    return { isValid: true };
  }

  transformInboundWebhook(
    rawPayload: any,
    _headers: Record<string, string | string[] | undefined>,
    correlationId: string,
  ): InternalIntegrationCommand {
    return {
      eventType: 'mock.vehicle.query',
      externalId: rawPayload.plate || 'MOCK_PLATE',
      entityType: 'PRODUCT',
      correlationId,
      payload: rawPayload,
      syncHash: 'mock-hash',
    };
  }

  async executeSync(input: SyncJobExecutionInput): Promise<SyncJobExecutionResult> {
    if (input.jobType === 'VEHICLE_LOOKUP') {
      const plate = (input.payload?.['plate'] as string) || '';
      const vin = (input.payload?.['vin'] as string) || '';
      const result = await this.lookupVehicle({ plate, vin });
      return {
        success: result.success,
        data: (result.data as unknown as Record<string, unknown>) || {},
        error: result.error,
      };
    }

    return {
      success: true,
      data: { message: 'Mock vehicle adapter sync executed' },
    };
  }

  async lookupVehicle(options: VehicleLookupOptions): Promise<VehicleLookupExecutionResult> {
    const rawPlate = options.plate?.trim().toUpperCase();
    const rawVin = options.vin?.trim().toUpperCase();

    // Simulation triggers
    if (rawPlate === 'RATELIMIT') {
      return {
        success: false,
        found: false,
        isTransient: true,
        statusCode: 429,
        error: 'Simulated 429 Too Many Requests: Rate limit exceeded (60 requests per minute).',
        sourceAttribution: 'Mock Vehicle Data Provider [TEST HARNESS]',
        disclaimer: VEHICLE_FITMENT_DISCLAIMER,
      };
    }

    if (rawPlate === 'TIMEOUT') {
      return {
        success: false,
        found: false,
        isTransient: true,
        statusCode: 408,
        error: 'Simulated 408 Request Timeout: Vehicle data provider timed out after 5000ms.',
        sourceAttribution: 'Mock Vehicle Data Provider [TEST HARNESS]',
        disclaimer: VEHICLE_FITMENT_DISCLAIMER,
      };
    }

    if (rawPlate === 'ERROR500') {
      return {
        success: false,
        found: false,
        isTransient: true,
        statusCode: 500,
        error: 'Simulated 500 Internal Server Error: Gateway failure communicating with transport registry.',
        sourceAttribution: 'Mock Vehicle Data Provider [TEST HARNESS]',
        disclaimer: VEHICLE_FITMENT_DISCLAIMER,
      };
    }

    if (rawPlate === 'NOTFOUND') {
      return {
        success: true,
        found: false,
        sourceAttribution: 'Mock Vehicle Data Provider [TEST HARNESS]',
        disclaimer: VEHICLE_FITMENT_DISCLAIMER,
      };
    }

    // Match exact known plate
    if (rawPlate && this.mockVehiclesByPlate[rawPlate]) {
      const v = this.mockVehiclesByPlate[rawPlate]!;
      return {
        success: true,
        found: true,
        data: {
          ...v,
          plate: rawPlate,
        },
        rawAttributes: {
          ...v,
          source: 'MOCK_TEST_HARNESS',
        },
        sourceAttribution: 'Mock Vehicle Data Provider [TEST HARNESS]',
        disclaimer: VEHICLE_FITMENT_DISCLAIMER,
      };
    }

    // Match by VIN if supplied
    if (rawVin) {
      const match = Object.entries(this.mockVehiclesByPlate).find(
        ([_, v]) => v.vin.toUpperCase() === rawVin,
      );
      if (match) {
        return {
          success: true,
          found: true,
          data: {
            ...match[1],
            plate: match[0],
            vin: rawVin,
          },
          rawAttributes: {
            ...match[1],
            source: 'MOCK_TEST_HARNESS',
          },
          sourceAttribution: 'Mock Vehicle Data Provider [TEST HARNESS]',
          disclaimer: VEHICLE_FITMENT_DISCLAIMER,
        };
      }
    }

    // Default fallback for any 6-character plate in test mode
    if (rawPlate && /^[A-Z0-9]{3,6}$/.test(rawPlate)) {
      return {
        success: true,
        found: true,
        data: {
          make: 'Toyota',
          model: 'Corolla',
          submodel: 'GX Hatchback 2.0L',
          year: 2019,
          chassisCode: 'MZEA12',
          bodyType: 'Hatchback 5-Door',
          engineSpec: '2.0L Dynamic Force (M20A-FKS)',
          ccRating: 1987,
          fuelType: 'Petrol',
          transmission: 'Direct Shift CVT',
          color: 'Eclipse Black',
          vin: `6T1COROLLA${rawPlate}99`,
          plate: rawPlate,
        },
        rawAttributes: {
          generated: true,
          source: 'MOCK_TEST_HARNESS',
        },
        sourceAttribution: 'Mock Vehicle Data Provider [TEST HARNESS]',
        disclaimer: VEHICLE_FITMENT_DISCLAIMER,
      };
    }

    // Plate not found
    return {
      success: true,
      found: false,
      sourceAttribution: 'Mock Vehicle Data Provider [TEST HARNESS]',
      disclaimer: VEHICLE_FITMENT_DISCLAIMER,
    };
  }
}

