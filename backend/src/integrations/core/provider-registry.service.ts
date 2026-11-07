import { Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationProviderAdapter } from './integration-adapter.interface';
import { MockIntegrationAdapter } from '../adapters/mock-integration.adapter';
import { MockVehicleAdapter } from '../adapters/mock-vehicle.adapter';
import { CarJamAdapter } from '../adapters/carjam.adapter';
import { IntegrationCapability } from '@pinnacle/contracts';

export interface ProviderDefinition {
  key: string;
  name: string;
  description: string;
  category: 'MARKETPLACE' | 'VEHICLE_DATA' | 'PARTS_PROCUREMENT' | 'TEST';
  isMock: boolean;
  capabilities: IntegrationCapability[];
}

export const KNOWN_PROVIDERS: ProviderDefinition[] = [
  {
    key: 'MOCK_MARKETPLACE',
    name: 'Mock Marketplace Harness',
    description: 'Local development & automated CI test provider harness. Safe for simulated testing.',
    category: 'TEST',
    isMock: true,
    capabilities: [
      'INVENTORY_SYNC_INBOUND',
      'INVENTORY_SYNC_OUTBOUND',
      'CATALOG_PUBLISH',
      'ORDERS_IMPORT',
      'ORDERS_STATUS_UPDATE',
      'WEBHOOK_INGESTION',
    ],
  },
  {
    key: 'MOCK_VEHICLE_DATA',
    name: 'Mock Vehicle Data Provider [TEST HARNESS]',
    description: 'Local test harness for plate and VIN lookups when live NZTA MVR credentials are unprovisioned.',
    category: 'TEST',
    isMock: true,
    capabilities: ['VEHICLE_FITMENT_QUERY'],
  },
  {
    key: 'TRADE_ME',
    name: 'Trade Me Motors & Parts (NZ)',
    description: 'New Zealand automotive marketplace for classifieds and fixed-price spares.',
    category: 'MARKETPLACE',
    isMock: false,
    capabilities: [
      'CATALOG_PUBLISH',
      'INVENTORY_SYNC_OUTBOUND',
      'ORDERS_IMPORT',
      'ORDERS_STATUS_UPDATE',
    ],
  },
  {
    key: 'EBAY',
    name: 'eBay Motors Australia',
    description: 'eBay Australia parts & accessories marketplace integration.',
    category: 'MARKETPLACE',
    isMock: false,
    capabilities: [
      'CATALOG_PUBLISH',
      'INVENTORY_SYNC_OUTBOUND',
      'ORDERS_IMPORT',
      'ORDERS_STATUS_UPDATE',
    ],
  },
  {
    key: 'SHOPIFY',
    name: 'Shopify Multichannel',
    description: 'External storefront sync for secondary web retail outlets.',
    category: 'MARKETPLACE',
    isMock: false,
    capabilities: [
      'CATALOG_PUBLISH',
      'INVENTORY_SYNC_OUTBOUND',
      'ORDERS_IMPORT',
    ],
  },
  {
    key: 'CARJAM',
    name: 'CarJam Vehicle Data NZ',
    description: 'Vehicle plate, chassis, and VIN fitment verification query service.',
    category: 'VEHICLE_DATA',
    isMock: false,
    capabilities: ['VEHICLE_FITMENT_QUERY'],
  },
  {
    key: 'PARTSTRADER',
    name: 'PartsTrader Procurement',
    description: 'Insurance collision parts quoting and trade order import.',
    category: 'PARTS_PROCUREMENT',
    isMock: false,
    capabilities: [
      'ORDERS_IMPORT',
      'ORDERS_STATUS_UPDATE',
    ],
  },
  {
    key: 'CAP_EZI',
    name: 'CAP Ezi Parts & Pricing',
    description: 'Automotive aftermarket catalogue and parts cross-referencing system.',
    category: 'PARTS_PROCUREMENT',
    isMock: false,
    capabilities: [
      'VEHICLE_FITMENT_QUERY',
      'INVENTORY_SYNC_INBOUND',
    ],
  },
];

@Injectable()
export class ProviderRegistryService {
  private readonly adapters = new Map<string, IntegrationProviderAdapter>();

  constructor(
    private readonly mockAdapter: MockIntegrationAdapter,
    private readonly mockVehicleAdapter?: MockVehicleAdapter,
    private readonly carjamAdapter?: CarJamAdapter,
  ) {
    if (this.mockAdapter) this.registerAdapter(this.mockAdapter);
    if (this.mockVehicleAdapter) this.registerAdapter(this.mockVehicleAdapter);
    if (this.carjamAdapter) this.registerAdapter(this.carjamAdapter);
  }

  registerAdapter(adapter: IntegrationProviderAdapter) {
    this.adapters.set(adapter.providerKey.toUpperCase(), adapter);
  }

  getAdapter(providerKey: string): IntegrationProviderAdapter {
    const adapter = this.adapters.get(providerKey.toUpperCase());
    if (!adapter) {
      throw new NotFoundException(
        `Integration adapter for provider "${providerKey}" is not registered or supported in this runtime.`,
      );
    }
    return adapter;
  }

  hasAdapter(providerKey: string): boolean {
    return this.adapters.has(providerKey.toUpperCase());
  }

  getKnownProviders(): ProviderDefinition[] {
    return [...KNOWN_PROVIDERS];
  }
}

