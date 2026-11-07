import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DashboardCategoryBreakdownDto,
  DashboardDateRange,
  DashboardFulfillmentQueuesDto,
  DashboardRecentActivityDto,
  DashboardSalesMetricsDto,
  DashboardStockHealthDto,
  DashboardSummaryDto,
  InventoryMovementType,
  OrderStatus,
  PaymentStatus,
  ShippingMethod,
  StockAlertItemDto,
} from '@pinnacle/contracts';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate comprehensive business metrics and queue backlog.
   */
  async getDashboardSummary(range: DashboardDateRange = '30d'): Promise<DashboardSummaryDto> {
    const { startDate, endDate, label } = this.resolveDateRange(range);

    const [sales, fulfillmentQueues, stockHealth, categoryBreakdown, recentActivity] =
      await Promise.all([
        this.calculateSalesMetrics(startDate, endDate),
        this.calculateFulfillmentQueues(),
        this.calculateStockHealth(),
        this.getCategoryBreakdown(),
        this.getRecentActivity(),
      ]);

    return {
      period: {
        range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label,
      },
      sales,
      fulfillmentQueues,
      stockHealth,
      categoryBreakdown,
      recentActivity,
    };
  }

  // ---------------------------------------------------------------------------
  // 1. Sales & Financial Metrics
  // ---------------------------------------------------------------------------

  private async calculateSalesMetrics(
    startDate: Date,
    endDate: Date,
  ): Promise<DashboardSalesMetricsDto> {
    const ordersInPeriod = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        totalAmount: true,
        orderStatus: true,
      },
    });

    const totalOrdersCount = ordersInPeriod.length;

    // Paid orders include all orders that advanced past PENDING_PAYMENT / CANCELLED
    const paidOrders = ordersInPeriod.filter((o) =>
      ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED'].includes(o.orderStatus),
    );
    const paidOrdersCount = paidOrders.length;

    const grossRevenueRaw = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const grossRevenue = Number(grossRevenueRaw.toFixed(2));

    // Calculate actual refunded amounts in period from PaymentTransactions
    const refundTransactions = await this.prisma.paymentTransaction.findMany({
      where: {
        status: 'REFUNDED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { amount: true },
    });

    const refundedAmountRaw = refundTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const refundedAmount = Number(refundedAmountRaw.toFixed(2));
    const netRevenue = Number(Math.max(0, grossRevenue - refundedAmount).toFixed(2));

    const averageOrderValue =
      paidOrdersCount > 0 ? Number((grossRevenue / paidOrdersCount).toFixed(2)) : 0.0;

    return {
      grossRevenue,
      netRevenue,
      refundedAmount,
      totalOrdersCount,
      paidOrdersCount,
      averageOrderValue,
      currency: 'AUD',
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Operational Backlog & Fulfillment Queues
  // ---------------------------------------------------------------------------

  private async calculateFulfillmentQueues(): Promise<DashboardFulfillmentQueuesDto> {
    const [
      awaitingPickPackCount,
      inFulfillmentCount,
      pendingPaymentCount,
      shippedCount,
      deliveredCount,
      pendingRmaInspectionCount,
    ] = await Promise.all([
      this.prisma.order.count({ where: { orderStatus: 'PAID' } }),
      this.prisma.order.count({ where: { orderStatus: 'PROCESSING' } }),
      this.prisma.order.count({ where: { orderStatus: 'PENDING_PAYMENT' } }),
      this.prisma.order.count({ where: { orderStatus: 'SHIPPED' } }),
      this.prisma.order.count({ where: { orderStatus: 'DELIVERED' } }),
      this.prisma.returnRequest.count({
        where: { status: { in: ['PENDING_REVIEW', 'APPROVED', 'RECEIVED_AWAITING_INSPECTION'] } },
      }),
    ]);

    return {
      awaitingPickPackCount,
      inFulfillmentCount,
      pendingPaymentCount,
      shippedCount,
      deliveredCount,
      pendingRmaInspectionCount,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Stock Health & Out of Stock / Low Stock Detection
  // ---------------------------------------------------------------------------

  private async calculateStockHealth(): Promise<DashboardStockHealthDto> {
    const publishedProducts = await this.prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        sku: true,
        productType: true,
        category: { select: { name: true } },
        inventoryItems: {
          select: {
            quantityOnHand: true,
            quantityReserved: true,
          },
        },
        serializedItems: {
          where: { status: 'AVAILABLE' },
          select: { id: true },
        },
      },
    });

    const lowStockItems: StockAlertItemDto[] = [];
    const outOfStockItems: StockAlertItemDto[] = [];

    for (const prod of publishedProducts) {
      let currentStock = 0;
      let reservedStock = 0;
      let sellableStock = 0;
      const threshold = prod.productType === 'BULK_QUANTITY' ? 4 : 1;

      if (prod.productType === 'BULK_QUANTITY') {
        currentStock = prod.inventoryItems.reduce((acc, i) => acc + i.quantityOnHand, 0);
        reservedStock = prod.inventoryItems.reduce((acc, i) => acc + i.quantityReserved, 0);
        sellableStock = Math.max(0, currentStock - reservedStock);
      } else {
        // Serialized parts (used seat belts)
        currentStock = prod.serializedItems.length;
        reservedStock = 0;
        sellableStock = currentStock;
      }

      const alertItem: StockAlertItemDto = {
        productId: prod.id,
        productName: prod.title,
        sku: prod.sku,
        category: prod.category?.name || 'General',
        productType: prod.productType as any,
        currentStock,
        reservedStock,
        sellableStock,
        threshold,
      };

      if (sellableStock === 0) {
        outOfStockItems.push(alertItem);
      } else if (sellableStock <= threshold) {
        lowStockItems.push(alertItem);
      }
    }

    return {
      totalPublishedProducts: publishedProducts.length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      lowStockItems: lowStockItems.slice(0, 10),
      outOfStockItems: outOfStockItems.slice(0, 10),
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Category Distribution
  // ---------------------------------------------------------------------------

  private async getCategoryBreakdown(): Promise<DashboardCategoryBreakdownDto[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        products: {
          where: { status: 'PUBLISHED' },
          select: { id: true },
        },
      },
    });

    return categories.map((cat) => ({
      categoryId: cat.id,
      name: cat.name,
      slug: cat.slug,
      activeProductCount: cat.products.length,
    }));
  }

  // ---------------------------------------------------------------------------
  // 5. Recent Operational Activity Feed
  // ---------------------------------------------------------------------------

  private async getRecentActivity(): Promise<DashboardRecentActivityDto> {
    const [recentOrders, recentMovements, recentAuditLogs] = await Promise.all([
      this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          shippingAddress: true,
          orderStatus: true,
          paymentStatus: true,
          totalAmount: true,
          createdAt: true,
        },
      }),
      this.prisma.inventoryMovement.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          inventoryItem: {
            include: { product: { select: { title: true, sku: true } } },
          },
          serializedItem: {
            include: { product: { select: { title: true, sku: true } } },
          },
          operator: {
            select: {
              staffProfile: { select: { firstName: true, lastName: true } },
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              staffProfile: { select: { firstName: true, lastName: true } },
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      recentOrders: recentOrders.map((o) => {
        const addr = (o.shippingAddress as any) || {};
        const name = `${addr.firstName || ''} ${addr.lastName || ''}`.trim() || 'Customer';
        const isClickAndCollect =
          addr.company?.includes('Click & Collect') ||
          (addr.city === 'Prestons' && addr.postalCode === '2170');
        const shippingMethod: ShippingMethod = isClickAndCollect
          ? 'CLICK_AND_COLLECT'
          : 'STANDARD_COURIER';

        return {
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: this.maskCustomerName(name),
          status: o.orderStatus as OrderStatus,
          paymentStatus: o.paymentStatus as PaymentStatus,
          shippingMethod,
          total: Number(o.totalAmount),
          createdAt: o.createdAt.toISOString(),
        };
      }),
      recentMovements: recentMovements.map((m) => {
        const prod = m.inventoryItem?.product || m.serializedItem?.product;
        const actorName = m.operator?.staffProfile
          ? `${m.operator.staffProfile.firstName} ${m.operator.staffProfile.lastName}`
          : m.operator?.email || 'System';

        return {
          id: m.id,
          productName: prod?.title || 'Warehouse Item',
          sku: prod?.sku || 'N/A',
          movementType: m.movementType as InventoryMovementType,
          quantity: m.quantityChange,
          actorName,
          createdAt: m.createdAt.toISOString(),
        };
      }),
      recentAuditLogs: recentAuditLogs.map((a) => {
        const actorName = a.actor?.staffProfile
          ? `${a.actor.staffProfile.firstName} ${a.actor.staffProfile.lastName}`
          : a.actor?.email || 'System';

        return {
          id: a.id,
          domain: a.domain,
          action: a.action,
          actorName,
          createdAt: a.createdAt.toISOString(),
        };
      }),
    };
  }

  // ---------------------------------------------------------------------------
  // Date Range Resolution
  // ---------------------------------------------------------------------------

  private resolveDateRange(range: DashboardDateRange): {
    startDate: Date;
    endDate: Date;
    label: string;
  } {
    const now = new Date();
    const endDate = new Date(now);

    let startDate: Date;
    let label: string;

    switch (range) {
      case 'today': {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        label = 'Today';
        break;
      }
      case '7d': {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        label = 'Last 7 Days';
        break;
      }
      case '30d': {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        label = 'Last 30 Days';
        break;
      }
      case '90d': {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        label = 'Last 90 Days';
        break;
      }
      case 'all':
      default: {
        startDate = new Date('2020-01-01T00:00:00Z');
        label = 'All Time';
        break;
      }
    }

    return { startDate, endDate, label };
  }

  private maskCustomerName(name?: string | null): string {
    if (!name) return 'Customer';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length <= 1) return parts[0] || 'Customer';
    const first = parts[0] || '';
    const last = parts[parts.length - 1] || '';
    const lastInitial = last.length > 0 ? last[0] : '';
    return `${first} ${lastInitial}.`;
  }
}
