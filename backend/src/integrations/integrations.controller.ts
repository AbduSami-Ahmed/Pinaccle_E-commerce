import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { IntegrationsService } from './integrations.service';
import {
  ConfigureIntegrationSecretsDto,
  CreateExternalMappingDto,
  ExternalIdMappingDto,
  IntegrationAccountDto,
  IntegrationSyncJobDto,
  SyncJobStatusContract,
  WebhookIngestionResultDto,
} from '@pinnacle/contracts';
import { MockIntegrationAdapter } from './adapters/mock-integration.adapter';

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly mockAdapter: MockIntegrationAdapter,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Inbound Webhook Ingestion (Public, Signature Verified)
  // ---------------------------------------------------------------------------

  @Public()
  @Post('webhooks/:provider')
  @ApiOperation({ summary: 'Public inbound webhook ingestion with cryptographic signature validation' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookIngestionResultDto> {
    const rawBody = (req as any).rawBody || req.body;
    return this.integrationsService.handleWebhook(provider, rawBody, headers);
  }

  // ---------------------------------------------------------------------------
  // 2. Admin Accounts & Secrets (RBAC Protected, Zero Secret Exposure)
  // ---------------------------------------------------------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('system:settings:manage')
  @Get('accounts')
  @ApiOperation({ summary: 'List integration accounts and status (Admin)' })
  async listAccounts(): Promise<IntegrationAccountDto[]> {
    return this.integrationsService.listAccounts();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('system:settings:manage')
  @Post('accounts/:provider/secrets')
  @ApiOperation({ summary: 'Store encrypted credentials for an integration provider (Admin)' })
  async configureAccountSecrets(
    @Param('provider') provider: string,
    @Body() dto: ConfigureIntegrationSecretsDto,
    @Query('environment') environment = 'sandbox',
  ): Promise<IntegrationAccountDto> {
    return this.integrationsService.configureAccountSecrets(provider, environment, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('system:settings:manage')
  @Post('accounts/:provider/disconnect')
  @ApiOperation({ summary: 'Disconnect an integration account (Admin)' })
  async disconnectAccount(
    @Param('provider') provider: string,
    @Query('environment') environment = 'sandbox',
  ): Promise<{ success: boolean; message: string }> {
    await this.integrationsService.disconnectAccount(provider, environment);
    return { success: true, message: `Account for ${provider} successfully disconnected.` };
  }

  // ---------------------------------------------------------------------------
  // 3. Sync Jobs & Dead-Letter Recovery (Admin)
  // ---------------------------------------------------------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('system:settings:manage')
  @Get('jobs')
  @ApiOperation({ summary: 'List sync jobs and audit log (Admin)' })
  async listJobs(
    @Query('status') status?: SyncJobStatusContract,
    @Query('provider') provider?: string,
    @Query('limit') limit?: number,
  ): Promise<IntegrationSyncJobDto[]> {
    return this.integrationsService.listSyncJobs({ status, provider, limit });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('system:settings:manage')
  @Post('jobs/:id/retry')
  @ApiOperation({ summary: 'Retry a failed or dead-letter sync job (Admin)' })
  async retryJob(@Param('id') id: string): Promise<IntegrationSyncJobDto> {
    return this.integrationsService.retryDeadLetterJob(id);
  }

  // ---------------------------------------------------------------------------
  // 4. External ID Mappings (Admin)
  // ---------------------------------------------------------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('system:settings:manage')
  @Get('mappings')
  @ApiOperation({ summary: 'List cross-platform external ID mappings (Admin)' })
  async listMappings(
    @Query('provider') provider?: string,
    @Query('entityType') entityType?: string,
  ): Promise<ExternalIdMappingDto[]> {
    return this.integrationsService.listMappings(provider, entityType);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('system:settings:manage')
  @Post('mappings')
  @ApiOperation({ summary: 'Create or update external ID mapping with anti-loop hash (Admin)' })
  async createMapping(@Body() dto: CreateExternalMappingDto): Promise<ExternalIdMappingDto> {
    return this.integrationsService.createOrUpdateMapping(dto);
  }

  // ---------------------------------------------------------------------------
  // 5. Mock Sandbox Testing Endpoint
  // ---------------------------------------------------------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('system:settings:manage')
  @Post('mock/simulate-webhook')
  @ApiOperation({ summary: 'Generate and dispatch a signed mock webhook for sandbox verification (Admin)' })
  async simulateMockWebhook(
    @Body() payload: Record<string, unknown>,
    @Query('secret') secret = 'mock-test-webhook-secret-key',
  ): Promise<WebhookIngestionResultDto> {
    const signed = this.mockAdapter.generateSignedMockWebhook(payload, secret);
    return this.integrationsService.handleWebhook('MOCK_MARKETPLACE', signed.payload, signed.headers);
  }
}
