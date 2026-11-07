import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogDto, AuditLogPageDto, AuditLogQueryDto } from '@pinnacle/contracts';

export interface CreateAuditEntryInput {
  actorId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  domain: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an immutable audit log entry.
   * Catches errors internally to prevent non-critical audit failures from aborting business operations.
   */
  async recordLog(input: CreateAuditEntryInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId ?? undefined,
          ipAddress: input.ipAddress ?? undefined,
          userAgent: input.userAgent ?? undefined,
          domain: input.domain,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          beforeState: input.beforeState ? (input.beforeState as any) : undefined,
          afterState: input.afterState ? (input.afterState as any) : undefined,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to record audit log for ${input.domain}:${input.action}`, err);
    }
  }

  /**
   * Search audit logs with pagination and filters.
   */
  async findLogs(query: AuditLogQueryDto): Promise<AuditLogPageDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.domain) {
      where.domain = { equals: query.domain, mode: 'insensitive' };
    }
    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }
    if (query.actorId) {
      where.actorId = query.actorId;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              staffProfile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const items: AuditLogDto[] = logs.map((log) => {
      const actorName = log.actor?.staffProfile
        ? `${log.actor.staffProfile.firstName} ${log.actor.staffProfile.lastName}`
        : (log.actor?.email ?? 'System / Anonymous');

      return {
        id: log.id,
        actorId: log.actorId,
        actorName,
        actorEmail: log.actor?.email ?? null,
        domain: log.domain,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        beforeState: (log.beforeState as Record<string, unknown> | null) ?? null,
        afterState: (log.afterState as Record<string, unknown> | null) ?? null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt.toISOString(),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Export audit log records as CSV format.
   */
  async exportLogsCsv(query: AuditLogQueryDto): Promise<string> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        ...(query.domain ? { domain: query.domain } : {}),
        ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      },
      take: 1000,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            email: true,
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const headers = [
      'Log ID',
      'Timestamp',
      'Domain',
      'Action',
      'Entity Type',
      'Entity ID',
      'Actor Name',
      'Actor Email',
      'IP Address',
    ];
    const rows = logs.map((log) => {
      const actorName = log.actor?.staffProfile
        ? `${log.actor.staffProfile.firstName} ${log.actor.staffProfile.lastName}`
        : 'System';
      return [
        log.id,
        log.createdAt.toISOString(),
        log.domain,
        log.action,
        log.entityType,
        log.entityId,
        `"${actorName.replace(/"/g, '""')}"`,
        log.actor?.email ?? 'N/A',
        log.ipAddress ?? 'N/A',
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
