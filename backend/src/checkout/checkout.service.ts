import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { PricingTaxService } from './pricing-tax.service';
import { ShippingCalculatorService } from './shipping-calculator.service';
import { InventoryService } from '../inventory/inventory.service';
import { InitiateCheckoutOrderBodyDto, ValidateCheckoutBodyDto } from './dto/checkout.dto';
import {
  CheckoutTotalsDto,
  CheckoutValidationItemDto,
  CheckoutValidationResponseDto,
  OrderAddressSnapshot,
  OrderDetailsDto,
  OrderItemSnapshotDto,
} from '@pinnacle/contracts';

const RESERVATION_EXPIRY_MINUTES = 15;

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly pricingTaxService: PricingTaxService,
    private readonly shippingCalculatorService: ShippingCalculatorService,
    private readonly inventoryService: InventoryService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Validate Checkout
  // ---------------------------------------------------------------------------

  async validateCheckout(
    cartSessionToken: string,
    dto: ValidateCheckoutBodyDto,
    customerId?: string,
  ): Promise<CheckoutValidationResponseDto> {
    const cart = await this.cartService.getCart(cartSessionToken, customerId);

    if (cart.items.length === 0) {
      return {
        isValid: false,
        totals: {
          subtotal: 0,
          taxAmount: 0,
          shippingFee: 0,
          discountAmount: 0,
          totalAmount: 0,
          currency: 'NZD',
          taxRatePercent: 15,
          isTaxInclusive: true,
        },
        items: [],
        shippingMethod: dto.shippingMethod,
        errors: ['Cart is empty. Please add items before proceeding to checkout.'],
      };
    }

    const validationItems: CheckoutValidationItemDto[] = [];
    const errors: string[] = [];
    let grossSubtotal = 0;

    for (const item of cart.items) {
      const isItemValid = item.isAvailable;
      if (!isItemValid) {
        errors.push(
          `Item "${item.productTitle}" (${item.saleUnitName}) is no longer available in the requested quantity.`,
        );
      }

      grossSubtotal += item.lineTotal;

      validationItems.push({
        productId: item.productId,
        productTitle: item.productTitle,
        sku: item.productSku,
        saleUnitName: item.saleUnitName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        available: isItemValid,
        message: isItemValid
          ? undefined
          : item.stockAvailabilityMessage || 'Insufficient inventory',
      });
    }

    const shippingFee = this.shippingCalculatorService.calculateShippingFee(
      dto.shippingMethod,
      dto.shippingAddress?.postalCode,
    );

    const taxResult = this.pricingTaxService.calculateTaxInclusive(grossSubtotal);
    const totalAmount = this.pricingTaxService.roundToTwoDecimals(grossSubtotal + shippingFee);

    const totals: CheckoutTotalsDto = {
      subtotal: grossSubtotal,
      taxAmount: taxResult.taxAmount,
      shippingFee,
      discountAmount: 0,
      totalAmount,
      currency: 'NZD',
      taxRatePercent: taxResult.taxRatePercent,
      isTaxInclusive: true,
    };

    return {
      isValid: errors.length === 0,
      totals,
      items: validationItems,
      shippingMethod: dto.shippingMethod,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Initiate Order Creation with 15-Min Concurrency Soft Reservations
  // ---------------------------------------------------------------------------

  async createOrder(
    cartSessionToken: string,
    dto: InitiateCheckoutOrderBodyDto,
    customerId?: string,
  ): Promise<OrderDetailsDto> {
    // 1. Retrieve cart with full recomputation
    const cart = await this.cartService.getCart(cartSessionToken, customerId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot initiate checkout with an empty cart');
    }

    if (cart.hasUnavailableItems) {
      throw new BadRequestException(
        'Some items in your cart are no longer available in the requested quantity. Please review your cart.',
      );
    }

    // 2. Calculate final server-side shipping and tax
    const shippingFee = this.shippingCalculatorService.calculateShippingFee(
      dto.shippingMethod,
      dto.shippingAddress.postalCode,
    );

    let grossSubtotal = 0;
    for (const item of cart.items) {
      grossSubtotal += item.lineTotal;
    }

    const taxCalc = this.pricingTaxService.calculateTaxInclusive(grossSubtotal);
    const totalAmount = this.pricingTaxService.roundToTwoDecimals(grossSubtotal + shippingFee);

    const reservationExpiry = new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000);
    const orderNumber = await this.generateOrderNumber();

    // Prepare address snapshots
    let shippingSnapshot: OrderAddressSnapshot = { ...dto.shippingAddress };
    if (dto.shippingMethod === 'CLICK_AND_COLLECT') {
      shippingSnapshot = {
        ...shippingSnapshot,
        company: 'Click & Collect (Sydney Depot)',
        line1: this.shippingCalculatorService.depotAddress.line1,
        city: this.shippingCalculatorService.depotAddress.city,
        state: this.shippingCalculatorService.depotAddress.state,
        postalCode: this.shippingCalculatorService.depotAddress.postalCode,
        country: 'AU',
        deliveryNotes: this.shippingCalculatorService.depotAddress.instructions,
      };
    }

    const billingSnapshot: OrderAddressSnapshot = dto.billingAddress
      ? { ...dto.billingAddress }
      : { ...shippingSnapshot };

    // 3. Atomically create Order, snapshot OrderItems, and reserve stock
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // Create main Order entity
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customerId || null,
          customerEmail: dto.customerEmail.trim().toLowerCase(),
          customerPhone: dto.customerPhone.trim(),
          shippingAddress: shippingSnapshot as any,
          billingAddress: billingSnapshot as any,
          orderStatus: 'PENDING_PAYMENT',
          paymentStatus: 'UNPAID',
          fulfillmentStatus: 'UNFULFILLED',
          subtotal: grossSubtotal,
          discountAmount: 0,
          shippingFee,
          taxAmount: taxCalc.taxAmount,
          totalAmount,
          currency: 'NZD',
          notes: dto.notes?.trim() || null,
        },
      });

      // Snapshot line items and place transactional inventory reservations
      for (const cartItem of cart.items) {
        const itemTax = this.pricingTaxService.calculateTaxInclusive(cartItem.lineTotal);

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: cartItem.productId,
            saleUnitConfigId: cartItem.saleUnitConfigId,
            serializedItemId: cartItem.serializedItemId || null,
            skuSnapshot: cartItem.productSku,
            titleSnapshot: cartItem.productTitle,
            saleUnitCodeSnapshot: cartItem.saleUnitConfigId,
            saleUnitNameSnapshot: cartItem.saleUnitName,
            baseQuantityMultiplierSnapshot: cartItem.saleUnitMultiplier,
            quantity: cartItem.quantity,
            baseUnitsConsumed: cartItem.totalPhysicalUnits,
            unitPrice: cartItem.unitPrice,
            discountAmount: 0,
            taxAmount: itemTax.taxAmount,
            totalPrice: cartItem.lineTotal,
          },
        });

        // Soft stock reservation hold (15-min timeout)
        await this.inventoryService.reserveStock(
          {
            orderId: order.id,
            cartItemId: cartItem.id,
            productId: cartItem.productId,
            saleUnitConfigId: cartItem.saleUnitConfigId,
            quantity: cartItem.quantity,
            serializedItemId: cartItem.serializedItemId || undefined,
            expiresAt: reservationExpiry.toISOString(),
          },
          customerId || 'CHECKOUT_SYSTEM',
        );
      }

      // Clear the items from cart now that they have been committed to this order
      await this.cartService.clearCart(cart.id);

      return order;
    });

    this.logger.log(
      `[Checkout] Created order ${createdOrder.orderNumber} ($${totalAmount} NZD) with ${RESERVATION_EXPIRY_MINUTES}-min stock reservation`,
    );

    return this.getOrderByNumber(createdOrder.orderNumber, customerId);
  }

  // ---------------------------------------------------------------------------
  // 3. Get Order by Order Number (Read strictly from database)
  // ---------------------------------------------------------------------------

  async getOrderByNumber(orderNumber: string, customerId?: string): Promise<OrderDetailsDto> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        stockReservations: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    if (customerId && order.customerId && order.customerId !== customerId) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    return this.mapOrderToDto(order);
  }

  // ---------------------------------------------------------------------------
  // 4. Get Order by UUID
  // ---------------------------------------------------------------------------

  async getOrderById(orderId: string, customerId?: string): Promise<OrderDetailsDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        stockReservations: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (customerId && order.customerId && order.customerId !== customerId) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    return this.mapOrderToDto(order);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempts = 0; attempts < 10; attempts++) {
      const random = Math.floor(100000 + Math.random() * 900000);
      const candidate = `PIN-${year}-${random}`;
      const existing = await this.prisma.order.findUnique({
        where: { orderNumber: candidate },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
    }
    return `PIN-${year}-${Date.now().toString().slice(-6)}`;
  }

  private mapOrderToDto(order: any): OrderDetailsDto {
    const items: OrderItemSnapshotDto[] = order.items.map((i: any) => ({
      id: i.id,
      productId: i.productId,
      skuSnapshot: i.skuSnapshot,
      titleSnapshot: i.titleSnapshot,
      saleUnitCodeSnapshot: i.saleUnitCodeSnapshot,
      saleUnitNameSnapshot: i.saleUnitNameSnapshot,
      baseQuantityMultiplierSnapshot: i.baseQuantityMultiplierSnapshot,
      quantity: i.quantity,
      baseUnitsConsumed: i.baseUnitsConsumed,
      unitPrice: Number(i.unitPrice),
      discountAmount: Number(i.discountAmount),
      taxAmount: Number(i.taxAmount),
      totalPrice: Number(i.totalPrice),
      serializedItemId: i.serializedItemId,
    }));

    const activeReservations = (order.stockReservations || []).filter(
      (r: any) => r.status === 'ACTIVE',
    );
    let earliestExpiry: Date | null = null;
    for (const curr of activeReservations) {
      const exp = new Date(curr.expiresAt);
      if (!earliestExpiry || exp < earliestExpiry) {
        earliestExpiry = exp;
      }
    }

    const shippingSnap = order.shippingAddress as OrderAddressSnapshot;
    const isClickAndCollect =
      shippingSnap.company?.includes('Click & Collect') ||
      ((shippingSnap.city === 'Auckland' || shippingSnap.city === 'Penrose') && shippingSnap.postalCode === '1061');

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      shippingFee: Number(order.shippingFee),
      taxAmount: Number(order.taxAmount),
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      shippingMethod: isClickAndCollect ? 'CLICK_AND_COLLECT' : 'STANDARD_COURIER',
      shippingAddress: shippingSnap,
      billingAddress: order.billingAddress as OrderAddressSnapshot,
      notes: order.notes,
      items,
      reservationExpiresAt: earliestExpiry ? earliestExpiry.toISOString() : null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
