import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { CryptoSecretsService } from './core/crypto-secrets.service';
import { ProviderRegistryService } from './core/provider-registry.service';
import { MockIntegrationAdapter } from './adapters/mock-integration.adapter';
import { MockVehicleAdapter } from './adapters/mock-vehicle.adapter';
import { CarJamAdapter } from './adapters/carjam.adapter';
import { EbayAdapter } from './adapters/ebay.adapter';
import { TradeMeAdapter } from './adapters/trademe.adapter';
import { VehicleLookupService } from './vehicle-lookup.service';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    CryptoSecretsService,
    ProviderRegistryService,
    MockIntegrationAdapter,
    MockVehicleAdapter,
    CarJamAdapter,
    EbayAdapter,
    TradeMeAdapter,
    VehicleLookupService,
  ],
  exports: [
    IntegrationsService,
    CryptoSecretsService,
    ProviderRegistryService,
    MockIntegrationAdapter,
    MockVehicleAdapter,
    CarJamAdapter,
    EbayAdapter,
    TradeMeAdapter,
    VehicleLookupService,
  ],
})
export class IntegrationsModule {}
