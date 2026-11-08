import { Test, TestingModule } from '@nestjs/testing';
import { AdminExportService } from './admin-export.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '@pinnacle/contracts';

describe('AdminExportService', () => {
  let service: AdminExportService;
  let prisma: {
    order: { findMany: jest.Mock };
    product: { findMany: jest.Mock };
  };
  let auditService: {
    recordLog: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      order: { findMany: jest.fn() },
      product: { findMany: jest.fn() },
    };
    auditService = {
      recordLog: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminExportService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AdminExportService>(AdminExportService);
  });

  describe('exportOrdersCsv', () => {
    const mockOrder = {
      orderNumber: 'ORD-2026-1001',
      createdAt: new Date('2026-11-06T10:00:00Z'),
      customerEmail: 'johnathan.doe@example.com',
      customerPhone: '+64 21 345 678',
      shippingAddress: {
        firstName: 'Johnathan',
        lastName: 'Doe',
        city: 'Auckland',
        state: 'Auckland',
        postalCode: '1010',
      },
      orderStatus: 'PAID',
      paymentStatus: 'PAID',
      subtotal: '200.00',
      taxAmount: '20.00',
      shippingFee: '25.00',
      totalAmount: '245.00',
    };

    it('masks customer PII when user lacks customers:view:pii_contact permission', async () => {
      prisma.order.findMany.mockResolvedValueOnce([mockOrder]);

      const staffUser: AuthenticatedUser = {
        sub: 'staff-user-1',
        email: 'warehouse@pinnacle.local',
        isStaff: true,
        permissions: ['orders:view:all'], // Lacks customers:view:pii_contact
      };

      const csv = await service.exportOrdersCsv('30d', staffUser);

      expect(csv).toContain('ORD-2026-1001');
      // Should mask name -> "Johnathan D."
      expect(csv).toContain('"Johnathan D."');
      // Should mask email -> "j***@example.com"
      expect(csv).toContain('"j***@example.com"');
      // Should mask phone
      expect(csv).toContain('+64 •••• •••• 5678');
      expect(csv).not.toContain('johnathan.doe@example.com');

      expect(auditService.recordLog).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'EXPORT',
          action: 'ORDERS_EXPORTED_CSV',
        }),
      );
    });

    it('outputs plain PII when user possesses customers:view:pii_contact permission', async () => {
      prisma.order.findMany.mockResolvedValueOnce([mockOrder]);

      const adminUser: AuthenticatedUser = {
        sub: 'admin-user-1',
        email: 'admin@pinnacle.local',
        isStaff: true,
        permissions: ['orders:view:all', 'customers:view:pii_contact'],
      };

      const csv = await service.exportOrdersCsv('30d', adminUser);

      expect(csv).toContain('"Johnathan Doe"');
      expect(csv).toContain('"johnathan.doe@example.com"');
      expect(csv).toContain('"+64 21 345 678"');
    });
  });

  describe('exportInventoryCsv', () => {
    const mockProduct = {
      sku: 'TYR-BRI-2055516',
      title: 'Bridgestone Ecopia EP300 205/55R16',
      productType: 'BULK_QUANTITY',
      status: 'PUBLISHED',
      category: { name: 'Tyres' },
      inventoryItems: [
        {
          quantityOnHand: 12,
          quantityReserved: 2,
          costPrice: '85.00',
          warehouse: { code: 'AKL-CENTRAL' },
        },
      ],
      serializedItems: [],
    };

    it('omits cost prices and valuation when caller lacks inventory:stock:view_cost_price', async () => {
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);

      const userWithoutCost: AuthenticatedUser = {
        sub: 'clerk-1',
        email: 'clerk@pinnacle.local',
        isStaff: true,
        permissions: ['inventory:stock:view_quantity'],
      };

      const csv = await service.exportInventoryCsv(userWithoutCost);

      expect(csv).toContain('TYR-BRI-2055516');
      expect(csv).not.toContain('Cost Price ($)');
      expect(csv).not.toContain('Inventory Valuation ($)');
      expect(csv).not.toContain('85.00');
    });

    it('includes cost price and total valuation when caller has inventory:stock:view_cost_price', async () => {
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);

      const managerUser: AuthenticatedUser = {
        sub: 'mgr-1',
        email: 'inventory.mgr@pinnacle.local',
        isStaff: true,
        permissions: ['inventory:stock:view_quantity', 'inventory:stock:view_cost_price'],
      };

      const csv = await service.exportInventoryCsv(managerUser);

      expect(csv).toContain('Cost Price ($)');
      expect(csv).toContain('Inventory Valuation ($)');
      expect(csv).toContain('85.00');
      // 10 available * 85.00 = 850.00
      expect(csv).toContain('850.00');
    });
  });
});
