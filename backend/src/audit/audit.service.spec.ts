import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: {
    auditLog: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'audit-1',
            actorId: 'user-1',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0',
            domain: 'STAFF',
            action: 'ROLES_ASSIGNED',
            entityType: 'USER',
            entityId: 'user-2',
            beforeState: { roles: ['SALES_DISPATCHER'] },
            afterState: { roles: ['INVENTORY_MGR'] },
            createdAt: new Date('2026-11-06T10:00:00Z'),
            actor: {
              email: 'admin@pinnacle.local',
              staffProfile: { firstName: 'Admin', lastName: 'Master' },
            },
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('records an audit entry successfully', async () => {
    await service.recordLog({
      actorId: 'user-1',
      domain: 'INVENTORY',
      action: 'STOCK_ADJUSTED',
      entityType: 'INVENTORY_ITEM',
      entityId: 'item-101',
      beforeState: { qty: 10 },
      afterState: { qty: 8 },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        domain: 'INVENTORY',
        action: 'STOCK_ADJUSTED',
        entityType: 'INVENTORY_ITEM',
        entityId: 'item-101',
      }),
    });
  });

  it('queries audit logs with pagination and actor formatting', async () => {
    const result = await service.findLogs({ domain: 'STAFF', page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.items.length).toBe(1);
    expect(result.items[0]?.actorName).toBe('Admin Master');
    expect(result.items[0]?.domain).toBe('STAFF');
  });

  it('exports audit logs as CSV', async () => {
    const csv = await service.exportLogsCsv({ domain: 'STAFF' });

    expect(csv).toContain(
      'Log ID,Timestamp,Domain,Action,Entity Type,Entity ID,Actor Name,Actor Email,IP Address',
    );
    expect(csv).toContain('audit-1');
    expect(csv).toContain('ROLES_ASSIGNED');
    expect(csv).toContain('"Admin Master"');
  });
});
