import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { CryptoSecretsService } from './core/crypto-secrets.service';
import { ProviderRegistryService } from './core/provider-registry.service';
import { MockIntegrationAdapter } from './adapters/mock-integration.adapter';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    CryptoSecretsService,
    ProviderRegistryService,
    MockIntegrationAdapter,
  ],
  exports: [
    IntegrationsService,
    CryptoSecretsService,
    ProviderRegistryService,
    MockIntegrationAdapter,
  ],
})
export class IntegrationsModule {}

