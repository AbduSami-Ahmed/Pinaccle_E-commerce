import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoSecretsService } from './core/crypto-secrets.service';
import { IntegrationLogger } from './core/integration-logger';
import { ProviderRegistryService } from './core/provider-registry.service';
import {
  ConfigureIntegrationSecretsDto,
  CreateExternalMappingDto,
  ExternalIdMappingDto,
  IntegrationAccountDto,
  IntegrationCapability,
  IntegrationSyncJobDto,
  SyncDirectionContract,
  SyncJobStatusContract,
  WebhookIngestionResultDto,
} from '@pinnacle/contracts';
import { randomUUID } from 'crypto';

@Injectable()
export class IntegrationsService {
  private readonly logger = new IntegrationLogger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoSecrets: CryptoSecretsService,
    private readonly registry: ProviderRegistryService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Integration Accounts & Status Management
  // ---------------------------------------------------------------------------

  async listAccounts(): Promise<IntegrationAccountDto[]> {
    const knownProviders = this.registry.getKnownProviders();
    const existingAccounts = await this.prisma.integrationAccount.findMany();

    const accountMap = new Map<string, (typeof existingAccounts)[0]>();
    for (const acc of existingAccounts) {
      accountMap.set(`${acc.provider.toUpperCase()}_${acc.environment}`, acc);
    }

    return knownProviders.map((def) => {
      const existing = accountMap.get(`${def.key}_sandbox`) || accountMap.get(`${def.key}_production`);

      if (existing) {
        return {
          id: existing.id,
          provider: def.key,
          name: existing.name,
          environment: existing.environment,
          status: existing.status,
          isActive: existing.isActive,
          capabilities: def.capabilities,
          settings: (existing.settings as Record<string, unknown> | null) ?? null,
          hasConfiguredSecrets: Boolean(existing.encryptedSecrets),
          lastSyncAt: existing.lastSyncAt ? existing.lastSyncAt.toISOString() : null,
          lastError: existing.lastError,
          createdAt: existing.createdAt.toISOString(),
        };
      }

      // Default representation for unconfigured providers (Strictly DISCONNECTED)
      return {
        id: `unconfigured-${def.key.toLowerCase()}`,
        provider: def.key,
        name: def.name,
        environment: 'sandbox',
        status: 'DISCONNECTED',
        isActive: false,
        capabilities: def.capabilities,
        settings: null,
        hasConfiguredSecrets: false,
        lastSyncAt: null,
        lastError: null,
        createdAt: new Date().toISOString(),
      };
    });
  }

  async configureAccountSecrets(
    provider: string,
    environment = 'sandbox',
    dto: ConfigureIntegrationSecretsDto,
  ): Promise<IntegrationAccountDto> {
    const providerKey = provider.toUpperCase();
    const correlationId = `sec_cfg_${randomUUID().slice(0, 8)}`;
    this.logger.log(`Configuring credentials for provider "${providerKey}" [${environment}]`, correlationId);

    // 1. Encrypt secrets using AES-256-GCM
    const encrypted = this.cryptoSecrets.encryptSecrets(dto.credentials);

    // 2. Validate credentials via adapter if registered
    let newStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' = 'DISCONNECTED';
    let lastError: string | null = null;

    if (this.registry.hasAdapter(providerKey)) {
      const adapter = this.registry.getAdapter(providerKey);
      try {
        const isValid = await adapter.validateCredentials(dto.credentials);
        if (isValid) {
          // If adapter is a mock or ready adapter, mark CONNECTED
          newStatus = 'CONNECTED';
        } else {
          newStatus = 'ERROR';
          lastError = 'Invalid credential parameters provided for adapter';
        }
      } catch (err) {
        newStatus = 'ERROR';
        lastError = (err as Error).message;
      }
    } else {
      // Live providers (Trade Me, eBay, Shopify, CarJam, etc.) are foundational in this phase.
      // Acceptance criterion: No live provider is falsely marked connected.
      newStatus = 'DISCONNECTED';
      lastError = 'Provider adapter foundation ready. Live API execution disabled in Phase 15.';
    }

    // 3. Upsert record in database
    const def = this.registry.getKnownProviders().find((p) => p.key === providerKey);
    const account = await this.prisma.integrationAccount.upsert({
      where: {
        provider_environment: {
          provider: providerKey,
          environment,
        },
      },
      create: {
        provider: providerKey,
        name: def?.name || `${providerKey} Account`,
        environment,
        status: newStatus,
        isActive: newStatus === 'CONNECTED',
        encryptedSecrets: encrypted.encryptedData,
        secretsIv: encrypted.iv,
        secretsTag: encrypted.authTag,
        keyVersion: encrypted.keyVersion,
        capabilities: def?.capabilities || [],
        lastError,
      },
      update: {
        encryptedSecrets: encrypted.encryptedData,
        secretsIv: encrypted.iv,
        secretsTag: encrypted.authTag,
        keyVersion: encrypted.keyVersion,
        status: newStatus,
        isActive: newStatus === 'CONNECTED',
        lastError,
      },
    });

    return {
      id: account.id,
      provider: account.provider,
      name: account.name,
      environment: account.environment,
      status: account.status,
      isActive: account.isActive,
      capabilities: (def?.capabilities || []) as IntegrationCapability[],
      settings: (account.settings as Record<string, unknown> | null) ?? null,
      hasConfiguredSecrets: true,
      lastSyncAt: account.lastSyncAt ? account.lastSyncAt.toISOString() : null,
      lastError: account.lastError,
      createdAt: account.createdAt.toISOString(),
    };
  }

  async disconnectAccount(provider: string, environment = 'sandbox'): Promise<void> {
    const providerKey = provider.toUpperCase();
    await this.prisma.integrationAccount.updateMany({
      where: { provider: providerKey, environment },
      data: {
        status: 'DISCONNECTED',
        isActive: false,
        lastError: null,
      },
    });
    this.logger.log(`Account disconnected for provider "${providerKey}" [${environment}]`);
  }

  // ---------------------------------------------------------------------------
  // 2. Webhook Ingestion Framework (Idempotent & Replay Protected)
  // ---------------------------------------------------------------------------

  async handleWebhook(
    provider: string,
    rawPayload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookIngestionResultDto> {
    const providerKey = provider.toUpperCase();
    const correlationId = `wh_${providerKey.toLowerCase()}_${randomUUID().slice(0, 8)}`;

    this.logger.log(`Incoming webhook received for "${providerKey}"`, correlationId);

    // 1. Resolve adapter
    const adapter = this.registry.getAdapter(providerKey);

    // 2. Resolve account & decrypt webhook signing secret
    const account = await this.prisma.integrationAccount.findFirst({
      where: { provider: providerKey, isActive: true },
    });

    let signingSecret = 'mock-test-webhook-secret-key';
    if (account?.encryptedSecrets && account.secretsIv && account.secretsTag) {
      const credentials = this.cryptoSecrets.decryptSecrets({
        encryptedData: account.encryptedSecrets,
        iv: account.secretsIv,
        authTag: account.secretsTag,
      });
      signingSecret = credentials['webhookSecret'] || credentials['apiSecret'] || signingSecret;
    }

    // 3. Cryptographic Signature & Replay Verification
    const verification = await adapter.verifyWebhookSignature(rawPayload, headers, signingSecret);

    if (verification.isReplay) {
      this.logger.warn(`Rejected replayed webhook for "${providerKey}": ${verification.failureReason}`, correlationId);
      return {
        received: false,
        status: 'REPLAY_REJECTED',
        correlationId,
        message: verification.failureReason,
      };
    }

    if (!verification.isValid) {
      this.logger.warn(`Rejected invalid webhook signature for "${providerKey}": ${verification.failureReason}`, correlationId);
      return {
        received: false,
        status: 'INVALID_SIGNATURE',
        correlationId,
        message: verification.failureReason,
      };
    }

    // 4. Parse payload and extract idempotency key
    let parsedBody: any;
    try {
      const bodyStr = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8');
      parsedBody = JSON.parse(bodyStr);
    } catch {
      throw new BadRequestException('Malformed JSON webhook payload');
    }

    const idempotencyKey =
      (headers['x-idempotency-key'] as string) ||
      parsedBody.idempotencyKey ||
      parsedBody.eventId ||
      parsedBody.id ||
      `${providerKey}_${Date.now()}`;

    // 5. Idempotency Protection: Deduplicate repeated events
    const existingEvent = await this.prisma.integrationSyncEvent.findUnique({
      where: { idempotencyKey },
    });

    if (existingEvent) {
      this.logger.log(
        `Duplicate webhook ignored. Idempotency key "${idempotencyKey}" already recorded as ${existingEvent.status}`,
        correlationId,
      );
      return {
        received: true,
        status: 'DUPLICATE_IGNORED',
        correlationId,
        message: 'Duplicate event ignored via idempotency check.',
      };
    }

    // 6. Convert external payload into internal command at the adapter boundary
    const internalCommand = adapter.transformInboundWebhook(parsedBody, headers, correlationId);

    // 7. Record sync event
    let accountId = account?.id;
    if (!accountId) {
      const fallbackAccount = await this.prisma.integrationAccount.findFirst({
        where: { provider: providerKey },
      });
      accountId = fallbackAccount?.id;
    }

    if (accountId) {
      await this.prisma.integrationSyncEvent.create({
        data: {
          integrationAccountId: accountId,
          eventType: internalCommand.eventType,
          externalId: internalCommand.externalId,
          idempotencyKey,
          status: 'PROCESSED',
          payload: (parsedBody as any) ?? null,
          processedAt: new Date(),
        },
      });

      // Schedule or execute background sync job
      await this.prisma.integrationSyncJob.create({
        data: {
          integrationAccountId: accountId,
          direction: 'INBOUND',
          jobType: internalCommand.eventType,
          status: 'COMPLETED',
          attempts: 1,
          correlationId,
          idempotencyKey: `job_${idempotencyKey}`,
          payload: internalCommand.payload as any,
          completedAt: new Date(),
        },
      });

      // Update external ID mapping with syncHash to detect anti-loop conditions
      await this.createOrUpdateMapping({
        provider: providerKey,
        entityType: internalCommand.entityType,
        internalId: internalCommand.externalId, // Inbound event maps externalId to internal entity
        externalId: internalCommand.externalId,
        syncHash: internalCommand.syncHash,
        metadata: { source: 'WEBHOOK', correlationId },
      });
    }

    this.logger.log(`Webhook successfully processed for ${providerKey} [${internalCommand.eventType}]`, correlationId);
    return {
      received: true,
      status: 'PROCESSED',
      correlationId,
      message: 'Webhook ingested and transformed successfully.',
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Sync Jobs, Retry Engine & Dead-Letter State
  // ---------------------------------------------------------------------------

  async listSyncJobs(query?: {
    status?: SyncJobStatusContract;
    provider?: string;
    limit?: number;
  }): Promise<IntegrationSyncJobDto[]> {
    const limit = Math.min(100, query?.limit || 30);
    const where: any = {};

    if (query?.status) {
      where.status = query.status;
    }
    if (query?.provider) {
      where.account = { provider: query.provider.toUpperCase() };
    }

    const jobs = await this.prisma.integrationSyncJob.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        account: { select: { provider: true } },
      },
    });

    return jobs.map((j) => ({
      id: j.id,
      integrationAccountId: j.integrationAccountId,
      provider: j.account.provider,
      direction: j.direction as SyncDirectionContract,
      jobType: j.jobType,
      status: j.status as SyncJobStatusContract,
      attempts: j.attempts,
      maxAttempts: j.maxAttempts,
      correlationId: j.correlationId,
      idempotencyKey: j.idempotencyKey,
      lastError: j.lastError,
      nextRetryAt: j.nextRetryAt ? j.nextRetryAt.toISOString() : null,
      startedAt: j.startedAt ? j.startedAt.toISOString() : null,
      completedAt: j.completedAt ? j.completedAt.toISOString() : null,
      createdAt: j.createdAt.toISOString(),
    }));
  }

  async executeSyncJob(jobId: string): Promise<IntegrationSyncJobDto> {
    const job = await this.prisma.integrationSyncJob.findUnique({
      where: { id: jobId },
      include: { account: true },
    });

    if (!job) {
      throw new NotFoundException(`Integration job ${jobId} not found`);
    }

    const correlationId = job.correlationId;
    this.logger.log(`Executing sync job "${job.jobType}" (Attempt ${job.attempts + 1}/${job.maxAttempts})`, correlationId);

    const adapter = this.registry.getAdapter(job.account.provider);

    await this.prisma.integrationSyncJob.update({
      where: { id: job.id },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    const result = await adapter.executeSync({
      jobId: job.id,
      jobType: job.jobType,
      direction: job.direction as any,
      payload: (job.payload as any) ?? null,
      correlationId,
      settings: (job.account.settings as any) ?? null,
    });

    if (result.success) {
      const completed = await this.prisma.integrationSyncJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          lastError: null,
          nextRetryAt: null,
        },
        include: { account: { select: { provider: true } } },
      });
      return this.toJobDto(completed);
    }

    // Failure Handling: Transient vs Dead-Letter
    const nextAttempts = job.attempts + 1;
    const isDeadLetter = !result.isTransient || nextAttempts >= job.maxAttempts;
    const nextRetryAt = isDeadLetter
      ? null
      : new Date(Date.now() + Math.pow(2, nextAttempts) * 30 * 1000); // Exponential backoff: 30s, 60s, 120s

    const failed = await this.prisma.integrationSyncJob.update({
      where: { id: job.id },
      data: {
        status: isDeadLetter ? 'DEAD_LETTER' : 'FAILED',
        lastError: result.error || 'Execution failure',
        nextRetryAt,
      },
      include: { account: { select: { provider: true } } },
    });

    this.logger.warn(
      `Job ${job.id} failed. State: ${failed.status} (Attempt ${nextAttempts}/${job.maxAttempts})`,
      correlationId,
    );

    return this.toJobDto(failed);
  }

  async retryDeadLetterJob(jobId: string): Promise<IntegrationSyncJobDto> {
    const job = await this.prisma.integrationSyncJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Integration job ${jobId} not found`);
    }

    // Reset attempts and execute immediately
    await this.prisma.integrationSyncJob.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        attempts: 0,
        lastError: null,
      },
    });

    return this.executeSyncJob(jobId);
  }

  // ---------------------------------------------------------------------------
  // 4. External ID Mappings (Anti-Loop & Cross-Reference Table)
  // ---------------------------------------------------------------------------

  async createOrUpdateMapping(dto: CreateExternalMappingDto): Promise<ExternalIdMappingDto> {
    const record = await this.prisma.externalIdMapping.upsert({
      where: {
        provider_entityType_internalId: {
          provider: dto.provider.toUpperCase(),
          entityType: dto.entityType,
          internalId: dto.internalId,
        },
      },
      create: {
        provider: dto.provider.toUpperCase(),
        entityType: dto.entityType,
        internalId: dto.internalId,
        externalId: dto.externalId,
        externalVersion: dto.externalVersion,
        syncHash: dto.syncHash,
        metadata: (dto.metadata as any) ?? null,
      },
      update: {
        externalId: dto.externalId,
        externalVersion: dto.externalVersion,
        syncHash: dto.syncHash,
        metadata: (dto.metadata as any) ?? null,
        lastSyncedAt: new Date(),
      },
    });

    return {
      id: record.id,
      provider: record.provider,
      entityType: record.entityType as any,
      internalId: record.internalId,
      externalId: record.externalId,
      externalVersion: record.externalVersion,
      syncHash: record.syncHash,
      lastSyncedAt: record.lastSyncedAt.toISOString(),
    };
  }

  async listMappings(provider?: string, entityType?: string): Promise<ExternalIdMappingDto[]> {
    const where: any = {};
    if (provider) where.provider = provider.toUpperCase();
    if (entityType) where.entityType = entityType;

    const mappings = await this.prisma.externalIdMapping.findMany({
      where,
      take: 50,
      orderBy: { lastSyncedAt: 'desc' },
    });

    return mappings.map((m) => ({
      id: m.id,
      provider: m.provider,
      entityType: m.entityType as any,
      internalId: m.internalId,
      externalId: m.externalId,
      externalVersion: m.externalVersion,
      syncHash: m.syncHash,
      lastSyncedAt: m.lastSyncedAt.toISOString(),
    }));
  }

  private toJobDto(j: any): IntegrationSyncJobDto {
    return {
      id: j.id,
      integrationAccountId: j.integrationAccountId,
      provider: j.account.provider,
      direction: j.direction,
      jobType: j.jobType,
      status: j.status,
      attempts: j.attempts,
      maxAttempts: j.maxAttempts,
      correlationId: j.correlationId,
      idempotencyKey: j.idempotencyKey,
      lastError: j.lastError,
      nextRetryAt: j.nextRetryAt ? j.nextRetryAt.toISOString() : null,
      startedAt: j.startedAt ? j.startedAt.toISOString() : null,
      completedAt: j.completedAt ? j.completedAt.toISOString() : null,
      createdAt: j.createdAt.toISOString(),
    };
  }
}
