import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardService } from './admin-dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let prisma: {
    order: { findMany: jest.Mock; count: jest.Mock };
    paymentTransaction: { findMany: jest.Mock };
    returnRequest: { count: jest.Mock };
    product: { findMany: jest.Mock; count: jest.Mock };
    category: { findMany: jest.Mock };
    inventoryMovement: { findMany: jest.Mock };
    auditLog: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      paymentTransaction: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      returnRequest: {
        count: jest.fn().mockResolvedValue(0),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      category: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      inventoryMovement: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
  });

  describe('calculateSalesMetrics', () => {
    it('calculates gross revenue, net revenue, and average order value correctly', async () => {
      // Mock orders in period (first call for metrics)
      prisma.order.findMany.mockResolvedValueOnce([
        { id: 'ord-1', totalAmount: '150.00', orderStatus: 'PAID' },
        { id: 'ord-2', totalAmount: '250.00', orderStatus: 'PROCESSING' },
        { id: 'ord-3', totalAmount: '100.00', orderStatus: 'DELIVERED' },
        { id: 'ord-4', totalAmount: '75.00', orderStatus: 'CANCELLED' }, // Excluded from gross revenue
      ]);

      // Mock refund transaction
      prisma.paymentTransaction.findMany.mockResolvedValueOnce([
        { amount: '50.00' },
      ]);

      // Fulfillment queues
      prisma.order.count.mockResolvedValue(2);
      prisma.returnRequest.count.mockResolvedValue(1);

      // Stock health
      prisma.product.findMany.mockResolvedValueOnce([
        {
          id: 'prod-tyre-1',
          title: 'Bridgestone Ecopia 205/55R16',
          sku: 'TYR-BRI-2055516',
          productType: 'BULK_QUANTITY',
          category: { name: 'Commercial & Passenger Tyres' },
          inventoryItems: [{ quantityOnHand: 10, quantityReserved: 2 }],
          serializedItems: [],
        },
        {
          id: 'prod-belt-1',
          title: 'Ford Falcon FG Front Right Seat Belt',
          sku: 'BELT-FOR-FG-FR',
          productType: 'INDIVIDUALLY_SERIALIZED',
          category: { name: 'Seat Belts & Harnesses' },
          inventoryItems: [],
          serializedItems: [], // Out of stock (0 available)
        },
      ]);

      // Categories
      prisma.category.findMany.mockResolvedValueOnce([
        { id: 'cat-1', name: 'Tyres', slug: 'tyres', products: [{ id: 'prod-tyre-1' }] },
      ]);

      const summary = await service.getDashboardSummary('30d');

      expect(summary.period.range).toBe('30d');
      expect(summary.period.label).toBe('Last 30 Days');

      // Gross: 150 + 250 + 100 = 500.00
      expect(summary.sales.grossRevenue).toBe(500.00);
      // Net: 500 - 50 = 450.00
      expect(summary.sales.refundedAmount).toBe(50.00);
      expect(summary.sales.netRevenue).toBe(450.00);
      expect(summary.sales.paidOrdersCount).toBe(3);
      expect(summary.sales.totalOrdersCount).toBe(4);
      // AOV: 500 / 3 = 166.67
      expect(summary.sales.averageOrderValue).toBe(166.67);
      expect(summary.sales.currency).toBe('AUD');

      // Stock health
      expect(summary.stockHealth.totalPublishedProducts).toBe(2);
      expect(summary.stockHealth.outOfStockCount).toBe(1);
      expect(summary.stockHealth.outOfStockItems[0]?.sku).toBe('BELT-FOR-FG-FR');
    });

    it('returns zero metrics when no orders exist in period', async () => {
      const summary = await service.getDashboardSummary('today');

      expect(summary.sales.grossRevenue).toBe(0);
      expect(summary.sales.netRevenue).toBe(0);
      expect(summary.sales.averageOrderValue).toBe(0);
      expect(summary.sales.totalOrdersCount).toBe(0);
      expect(summary.sales.paidOrdersCount).toBe(0);
    });
  });

  describe('calculateStockHealth', () => {
    it('accurately identifies low stock when available is below threshold', async () => {
      // Low stock tyre (3 units available <= 4)
      prisma.product.findMany.mockResolvedValueOnce([
        {
          id: 'prod-tyre-low',
          title: 'Michelin Primacy 4 225/50R17',
          sku: 'TYR-MIC-2255017',
          productType: 'BULK_QUANTITY',
          category: { name: 'Tyres' },
          inventoryItems: [{ quantityOnHand: 5, quantityReserved: 2 }], // 3 available
          serializedItems: [],
        },
      ]);

      const summary = await service.getDashboardSummary('7d');

      expect(summary.stockHealth.lowStockCount).toBe(1);
      expect(summary.stockHealth.lowStockItems[0]?.sellableStock).toBe(3);
      expect(summary.stockHealth.lowStockItems[0]?.threshold).toBe(4);
    });
  });
});