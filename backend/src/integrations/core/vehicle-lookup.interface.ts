export interface VehicleLookupOptions {
  plate?: string;
  vin?: string;
  country?: 'NZ' | 'AU';
  correlationId?: string;
}

export interface NormalizedVehicleData {
  make: string;
  model: string;
  submodel?: string;
  year: number;
  chassisCode?: string;
  bodyType?: string;
  engineSpec?: string;
  ccRating?: number;
  fuelType?: string;
  transmission?: string;
  color?: string;
  vin?: string;
  plate?: string;
}

export interface VehicleLookupExecutionResult {
  success: boolean;
  found: boolean;
  data?: NormalizedVehicleData;
  rawAttributes?: Record<string, unknown>;
  sourceAttribution: string;
  isBlocked?: boolean;
  blockerReason?: string;
  isTransient?: boolean;
  error?: string;
  statusCode?: number;
  disclaimer: string;
}

export interface VehicleLookupAdapter {
  readonly providerKey: string;
  readonly displayName: string;
  readonly isMock: boolean;

  lookupVehicle(
    options: VehicleLookupOptions,
    credentials?: Record<string, string>,
  ): Promise<VehicleLookupExecutionResult>;
}

