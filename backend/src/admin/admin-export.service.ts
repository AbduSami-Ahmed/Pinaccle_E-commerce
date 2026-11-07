import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser, DashboardDateRange } from '@pinnacle/contracts';

@Injectable()
export class AdminExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Export orders with PII masking protection if caller lacks pii_contact permission.
   */
  async exportOrdersCsv(
    range: DashboardDateRange = '30d',
    user: AuthenticatedUser,
  ): Promise<string> {
    const hasPii = user.permissions.includes('customers:view:pii_contact');
    const { startDate, endDate } = this.resolveDateRange(range);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const headers = [
      'Order Number',
      'Date (AEST/UTC)',
      'Customer Name',
      'Customer Email',
      'Phone Number',
      'Shipping Method',
      'Order Status',
      'Payment Status',
      'Subtotal ($)',
      'Tax GST ($)',
      'Shipping ($)',
      'Total ($)',
    ];

    const rows = orders.map((o) => {
      const addr = (o.shippingAddress as any) || {};
      const rawName = `${addr.firstName || ''} ${addr.lastName || ''}`.trim() || 'Customer';
      const isClickAndCollect =
        addr.company?.includes('Click & Collect') ||
        (addr.city === 'Prestons' && addr.postalCode === '2170');
      const shippingMethod = isClickAndCollect ? 'CLICK_AND_COLLECT' : 'STANDARD_COURIER';

      const customerName = hasPii ? rawName : this.maskName(rawName);
      const email = hasPii ? o.customerEmail : this.maskEmail(o.customerEmail);
      const phone = hasPii ? (o.customerPhone || 'N/A') : this.maskPhone(o.customerPhone);

      return [
        o.orderNumber,
        o.createdAt.toISOString(),
        `"${customerName.replace(/"/g, '""')}"`,
        `"${email.replace(/"/g, '""')}"`,
        `"${phone.replace(/"/g, '""')}"`,
        shippingMethod,
        o.orderStatus,
        o.paymentStatus,
        Number(o.subtotal).toFixed(2),
        Number(o.taxAmount).toFixed(2),
        Number(o.shippingFee).toFixed(2),
        Number(o.totalAmount).toFixed(2),
      ].join(',');
    });

    await this.auditService.recordLog({
      actorId: user.sub,
      domain: 'EXPORT',
      action: 'ORDERS_EXPORTED_CSV',
      entityType: 'ORDER',
      entityId: `range:${range}`,
      beforeState: { piiMasked: !hasPii, recordCount: orders.length },
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export inventory valuation and stock levels with cost masking protection.
   */
  async exportInventoryCsv(user: AuthenticatedUser): Promise<string> {
    const hasCostPrice = user.permissions.includes('inventory:stock:view_cost_price');

    const products = await this.prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { sku: 'asc' },
      take: 2000,
      include: {
        category: { select: { name: true } },
        inventoryItems: {
          include: { warehouse: { select: { code: true } } },
        },
        serializedItems: {
          where: { status: 'AVAILABLE' },
          include: { warehouse: { select: { code: true } } },
        },
      },
    });

    const headers = [
      'SKU',
      'Product Name',
      'Category',
      'Product Type',
      'Warehouses',
      'Quantity On Hand',
      'Quantity Reserved',
      'Sellable Available',
      'Stock Alert Status',
    ];

    if (hasCostPrice) {
      headers.push('Cost Price ($)', 'Inventory Valuation ($)');
    }

    const rows = products.map((prod) => {
      let qoh = 0;
      let qReserved = 0;
      let qAvailable = 0;
      let costPrice = 0;
      const warehouseCodes = new Set<string>();

      if (prod.productType === 'BULK_QUANTITY') {
        qoh = prod.inventoryItems.reduce((acc, i) => acc + i.quantityOnHand, 0);
        qReserved = prod.inventoryItems.reduce((acc, i) => acc + i.quantityReserved, 0);
        qAvailable = Math.max(0, qoh - qReserved);
        costPrice = Number(prod.inventoryItems[0]?.costPrice || 0);
        prod.inventoryItems.forEach((i) => warehouseCodes.add(i.warehouse.code));
      } else {
        qoh = prod.serializedItems.length;
        qReserved = 0;
        qAvailable = qoh;
        costPrice = Number(prod.serializedItems[0]?.costPrice || 0);
        prod.serializedItems.forEach((s) => warehouseCodes.add(s.warehouse.code));
      }

      const alertStatus =
        qAvailable === 0 ? 'OUT_OF_STOCK' : qAvailable <= 4 ? 'LOW_STOCK' : 'OPTIMAL';
      const warehouses = Array.from(warehouseCodes).join(';');

      const row = [
        prod.sku,
        `"${prod.title.replace(/"/g, '""')}"`,
        `"${(prod.category?.name || 'General').replace(/"/g, '""')}"`,
        prod.productType,
        `"${warehouses}"`,
        qoh,
        qReserved,
        qAvailable,
        alertStatus,
      ];

      if (hasCostPrice) {
        row.push(costPrice.toFixed(2), (costPrice * qAvailable).toFixed(2));
      }

      return row.join(',');
    });

    await this.auditService.recordLog({
      actorId: user.sub,
      domain: 'EXPORT',
      action: 'INVENTORY_EXPORTED_CSV',
      entityType: 'INVENTORY',
      entityId: 'global',
      beforeState: { costIncluded: hasCostPrice, productCount: products.length },
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private resolveDateRange(range: DashboardDateRange): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);

    let startDate: Date;
    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = new Date('2020-01-01T00:00:00Z');
        break;
    }

    return { startDate, endDate };
  }

  private maskName(name?: string | null): string {
    if (!name) return 'Customer';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length <= 1) return parts[0] || 'Customer';
    const first = parts[0] || '';
    const last = parts[parts.length - 1] || '';
    const lastInitial = last.length > 0 ? last[0] : '';
    return `${first} ${lastInitial}.`;
  }

  private maskEmail(email?: string | null): string {
    if (!email) return 'N/A';
    const parts = email.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return '***@***.***';
    const user = parts[0];
    const initial = user.length > 0 ? user[0] : '*';
    return `${initial}***@${parts[1]}`;
  }

  private maskPhone(phone?: string | null): string {
    if (!phone) return 'N/A';
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) return '••••';
    return `+61 •••• •••• ${digits.slice(-4)}`;
  }
}
