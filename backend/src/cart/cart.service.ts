import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto, CartDto, CartItemDto, CartTotalsDto } from '@pinnacle/contracts';
import { randomUUID } from 'crypto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Cart Resolution
  // ---------------------------------------------------------------------------

  async getOrCreateCart(sessionToken: string, customerId?: string) {
    const now = new Date();
    const guestExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    const customerExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    if (customerId) {
      // Find active authenticated cart
      let cart = await this.prisma.cart.findFirst({
        where: {
          customerId,
          expiresAt: { gt: now },
        },
      });

      if (!cart) {
        // Check if there is an anonymous guest cart using this sessionToken to claim
        const guestCart = await this.prisma.cart.findUnique({
          where: { sessionToken },
        });

        if (guestCart && !guestCart.customerId) {
          cart = await this.prisma.cart.update({
            where: { id: guestCart.id },
            data: { customerId, expiresAt: customerExpiry },
          });
        } else {
          // Create new authenticated cart
          cart = await this.prisma.cart.create({
            data: {
              customerId,
              sessionToken: `cust_${randomUUID()}`,
              currency: 'NZD',
              expiresAt: customerExpiry,
            },
          });
        }
      }
      return cart;
    }

    // Guest cart
    let guestCart = await this.prisma.cart.findUnique({
      where: { sessionToken },
    });

    if (!guestCart || guestCart.expiresAt <= now) {
      guestCart = await this.prisma.cart.create({
        data: {
          sessionToken,
          currency: 'NZD',
          expiresAt: guestExpiry,
        },
      });
    }

    return guestCart;
  }

  // ---------------------------------------------------------------------------
  // Get Cart (with full real-time price & stock recomputation)
  // ---------------------------------------------------------------------------

  async getCart(sessionToken: string, customerId?: string): Promise<CartDto> {
    const cart = await this.getOrCreateCart(sessionToken, customerId);

    const fullCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                media: { orderBy: { displayOrder: 'asc' }, take: 1 },
                category: { select: { slug: true } },
                inventoryItems: true,
              },
            },
            saleUnit: true,
            serializedItem: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!fullCart) {
      throw new NotFoundException('Cart not found');
    }

    const calculatedItems: CartItemDto[] = [];
    let subtotal = 0;
    let totalPacksCount = 0;
    let totalPhysicalUnitsCount = 0;
    let hasUnavailableItems = false;

    for (const item of fullCart.items) {
      const product = item.product;
      const saleUnit = item.saleUnit;
      const multiplier = saleUnit.baseQuantityMultiplier;
      const isIndividuallyTracked = !!item.serializedItemId;

      // Real-time server-side retail price
      const unitPrice = Number(saleUnit.retailPrice);
      const lineTotal = Number((unitPrice * item.quantity).toFixed(2));

      // Calculate real physical sellable inventory
      let maxAvailablePacks = 0;
      let isAvailable = true;
      let stockAvailabilityMessage: string | undefined = undefined;

      if (isIndividuallyTracked) {
        const isAvailableInStock =
          item.serializedItem?.status === 'AVAILABLE' && product.status === 'PUBLISHED';
        maxAvailablePacks = isAvailableInStock ? 1 : 0;
        isAvailable = isAvailableInStock && item.quantity === 1;

        if (!isAvailable) {
          stockAvailabilityMessage =
            'This unique serialized part has been sold or is temporarily unavailable.';
          hasUnavailableItems = true;
        }
      } else {
        const totalOnHand = product.inventoryItems.reduce(
          (acc, inv) => acc + inv.quantityOnHand,
          0,
        );
        const totalReserved = product.inventoryItems.reduce(
          (acc, inv) => acc + inv.quantityReserved,
          0,
        );
        const sellableBaseUnits = Math.max(0, totalOnHand - totalReserved);
        maxAvailablePacks = Math.floor(sellableBaseUnits / multiplier);

        if (product.status !== 'PUBLISHED') {
          isAvailable = false;
          stockAvailabilityMessage = 'This product is no longer active in our catalog.';
          hasUnavailableItems = true;
        } else if (maxAvailablePacks === 0) {
          isAvailable = false;
          stockAvailabilityMessage = 'Item is currently out of stock in Auckland depot.';
          hasUnavailableItems = true;
        } else if (item.quantity > maxAvailablePacks) {
          isAvailable = false;
          stockAvailabilityMessage = `Only ${maxAvailablePacks} pack(s) remaining in stock.`;
          hasUnavailableItems = true;
        }
      }

      const totalPhysicalUnits = item.quantity * multiplier;
      subtotal += lineTotal;
      totalPacksCount += item.quantity;
      totalPhysicalUnitsCount += totalPhysicalUnits;

      calculatedItems.push({
        id: item.id,
        cartId: item.cartId,
        productId: product.id,
        productTitle: product.title,
        productSlug: product.slug,
        productSku: product.sku,
        productBrand: product.brand,
        categorySlug: product.category.slug,
        primaryImageUrl: product.media[0]?.cdnUrl || null,
        saleUnitConfigId: saleUnit.id,
        saleUnitName: saleUnit.name,
        saleUnitMultiplier: multiplier,
        quantity: item.quantity,
        totalPhysicalUnits,
        unitPrice,
        lineTotal,
        isAvailable,
        maxAvailableQuantity: maxAvailablePacks,
        stockAvailabilityMessage,
        serializedItemId: item.serializedItemId,
        serializedStockBarcode: item.serializedItem?.stockBarcode || null,
        isIndividuallyTracked,
      });
    }

    // Tax is included (15% New Zealand GST standard: 15/115 fraction)
    const taxIncluded = Number((subtotal * (15 / 115)).toFixed(2));
    const shippingEstimate = 0.0; // Click & collect default
    const total = Number((subtotal + shippingEstimate).toFixed(2));

    const totals: CartTotalsDto = {
      subtotal: Number(subtotal.toFixed(2)),
      taxIncluded,
      shippingEstimate,
      shippingMethod: 'CLICK_AND_COLLECT',
      total,
      currency: fullCart.currency,
    };

    return {
      id: fullCart.id,
      sessionToken: fullCart.sessionToken,
      customerId: fullCart.customerId,
      currency: fullCart.currency,
      items: calculatedItems,
      totals,
      totalPacksCount,
      totalPhysicalUnitsCount,
      hasUnavailableItems,
      updatedAt: fullCart.updatedAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Add Item to Cart
  // ---------------------------------------------------------------------------

  async addItem(sessionToken: string, dto: AddToCartDto, customerId?: string): Promise<CartDto> {
    const cart = await this.getOrCreateCart(sessionToken, customerId);
    const quantityToAdd = dto.quantity ?? 1;

    if (quantityToAdd < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    // Verify product exists and is active
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        saleUnits: true,
        inventoryItems: true,
      },
    });

    if (!product || product.status !== 'PUBLISHED') {
      throw new BadRequestException('Product is not active or available in the catalog');
    }

    // Verify sale unit config exists and belongs to product
    const saleUnit = product.saleUnits.find((s) => s.id === dto.saleUnitConfigId);
    if (!saleUnit || !saleUnit.isActive) {
      throw new BadRequestException('Selected sale unit configuration is invalid or inactive');
    }

    const multiplier = saleUnit.baseQuantityMultiplier;
    const unitPrice = Number(saleUnit.retailPrice);

    if (dto.serializedItemId) {
      // Individually tracked part check
      if (quantityToAdd !== 1) {
        throw new BadRequestException(
          'Individually tracked parts can only be purchased in quantity 1',
        );
      }

      const serializedItem = await this.prisma.serializedInventoryItem.findUnique({
        where: { id: dto.serializedItemId },
      });

      if (!serializedItem || serializedItem.status !== 'AVAILABLE') {
        throw new BadRequestException('This serialized item is no longer available');
      }

      // Check if item is already in another cart
      const existingInCart = await this.prisma.cartItem.findUnique({
        where: { serializedItemId: dto.serializedItemId },
      });

      if (existingInCart) {
        if (existingInCart.cartId === cart.id) {
          throw new BadRequestException('This serialized item is already in your cart');
        }
        throw new BadRequestException('This serialized part is currently reserved in another cart');
      }

      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          saleUnitConfigId: saleUnit.id,
          serializedItemId: dto.serializedItemId,
          quantity: 1,
          unitPrice,
        },
      });
    } else {
      // Bulk quantity item check
      const totalOnHand = product.inventoryItems.reduce((acc, inv) => acc + inv.quantityOnHand, 0);
      const totalReserved = product.inventoryItems.reduce(
        (acc, inv) => acc + inv.quantityReserved,
        0,
      );
      const sellableBaseUnits = Math.max(0, totalOnHand - totalReserved);
      const maxAvailablePacks = Math.floor(sellableBaseUnits / multiplier);

      if (maxAvailablePacks <= 0) {
        throw new BadRequestException('This product is currently out of stock');
      }

      const existingItem = await this.prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: product.id,
          saleUnitConfigId: saleUnit.id,
          serializedItemId: null,
        },
      });

      const totalDesiredPacks = existingItem
        ? existingItem.quantity + quantityToAdd
        : quantityToAdd;

      if (totalDesiredPacks > maxAvailablePacks) {
        throw new BadRequestException(
          `Cannot add ${quantityToAdd} pack(s). Total requested (${totalDesiredPacks} packs = ${totalDesiredPacks * multiplier} units) exceeds available depot stock (${maxAvailablePacks} packs available).`,
        );
      }

      if (existingItem) {
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: totalDesiredPacks,
            unitPrice,
          },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            saleUnitConfigId: saleUnit.id,
            quantity: quantityToAdd,
            unitPrice,
          },
        });
      }
    }

    // Touch cart updatedAt
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });

    return this.getCart(cart.sessionToken, customerId);
  }

  // ---------------------------------------------------------------------------
  // Update Item Quantity
  // ---------------------------------------------------------------------------

  async updateItemQuantity(
    sessionToken: string,
    itemId: string,
    quantity: number,
    customerId?: string,
  ): Promise<CartDto> {
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: { include: { inventoryItems: true } },
        saleUnit: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Cart item ${itemId} not found`);
    }

    // Enforce ownership: must match either customerId or sessionToken
    this.assertCartOwnership(item.cart, sessionToken, customerId);

    if (item.serializedItemId && quantity > 1) {
      throw new BadRequestException('Serialized used parts cannot have a quantity greater than 1');
    }

    if (!item.serializedItemId) {
      const multiplier = item.saleUnit.baseQuantityMultiplier;
      const totalOnHand = item.product.inventoryItems.reduce(
        (acc, inv) => acc + inv.quantityOnHand,
        0,
      );
      const totalReserved = item.product.inventoryItems.reduce(
        (acc, inv) => acc + inv.quantityReserved,
        0,
      );
      const sellableBaseUnits = Math.max(0, totalOnHand - totalReserved);
      const maxAvailablePacks = Math.floor(sellableBaseUnits / multiplier);

      if (quantity > maxAvailablePacks) {
        throw new BadRequestException(
          `Requested quantity (${quantity} packs) exceeds available stock (${maxAvailablePacks} packs available).`,
        );
      }
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    await this.prisma.cart.update({
      where: { id: item.cartId },
      data: { updatedAt: new Date() },
    });

    return this.getCart(sessionToken, customerId);
  }

  // ---------------------------------------------------------------------------
  // Remove Item
  // ---------------------------------------------------------------------------

  async removeItem(sessionToken: string, itemId: string, customerId?: string): Promise<CartDto> {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item) {
      throw new NotFoundException(`Cart item ${itemId} not found`);
    }

    this.assertCartOwnership(item.cart, sessionToken, customerId);

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    await this.prisma.cart.update({
      where: { id: item.cartId },
      data: { updatedAt: new Date() },
    });

    return this.getCart(sessionToken, customerId);
  }

  // ---------------------------------------------------------------------------
  // Clear Cart
  // ---------------------------------------------------------------------------

  async clearCart(cartId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }

  async clearCartSession(sessionToken: string, customerId?: string): Promise<CartDto> {
    const cart = await this.getOrCreateCart(sessionToken, customerId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });

    return this.getCart(sessionToken, customerId);
  }

  // ---------------------------------------------------------------------------
  // Safe Cart Merge on Customer Login
  // ---------------------------------------------------------------------------

  async mergeGuestCart(guestSessionToken: string, customerId: string): Promise<CartDto> {
    const guestCart = await this.prisma.cart.findUnique({
      where: { sessionToken: guestSessionToken },
      include: {
        items: {
          include: {
            product: { include: { inventoryItems: true } },
            saleUnit: true,
          },
        },
      },
    });

    if (!guestCart || guestCart.customerId || guestCart.items.length === 0) {
      // Nothing to merge or already belongs to an account
      return this.getCart(guestSessionToken, customerId);
    }

    const customerCart = await this.getOrCreateCart(`cust_${randomUUID()}`, customerId);

    for (const guestItem of guestCart.items) {
      if (guestItem.serializedItemId) {
        // Serialized item: move to customer cart if not already present
        const alreadyInCustomerCart = await this.prisma.cartItem.findUnique({
          where: { serializedItemId: guestItem.serializedItemId },
        });

        if (!alreadyInCustomerCart) {
          await this.prisma.cartItem.update({
            where: { id: guestItem.id },
            data: { cartId: customerCart.id },
          });
        } else {
          // Duplicate serialized item; delete guest copy
          await this.prisma.cartItem.delete({ where: { id: guestItem.id } });
        }
      } else {
        // Bulk item: check if customer cart already has this product + sale unit
        const existing = await this.prisma.cartItem.findFirst({
          where: {
            cartId: customerCart.id,
            productId: guestItem.productId,
            saleUnitConfigId: guestItem.saleUnitConfigId,
            serializedItemId: null,
          },
        });

        const totalOnHand = guestItem.product.inventoryItems.reduce(
          (acc, inv) => acc + inv.quantityOnHand,
          0,
        );
        const totalReserved = guestItem.product.inventoryItems.reduce(
          (acc, inv) => acc + inv.quantityReserved,
          0,
        );
        const sellable = Math.max(0, totalOnHand - totalReserved);
        const maxPacks = Math.floor(sellable / guestItem.saleUnit.baseQuantityMultiplier);

        if (existing) {
          const mergedQty = Math.min(existing.quantity + guestItem.quantity, maxPacks);
          await this.prisma.cartItem.update({
            where: { id: existing.id },
            data: { quantity: mergedQty },
          });
          await this.prisma.cartItem.delete({ where: { id: guestItem.id } });
        } else {
          const cappedQty = Math.min(guestItem.quantity, maxPacks);
          if (cappedQty > 0) {
            await this.prisma.cartItem.update({
              where: { id: guestItem.id },
              data: { cartId: customerCart.id, quantity: cappedQty },
            });
          } else {
            await this.prisma.cartItem.delete({ where: { id: guestItem.id } });
          }
        }
      }
    }

    // Delete the empty guest cart
    await this.prisma.cart.delete({
      where: { id: guestCart.id },
    });

    return this.getCart(customerCart.sessionToken, customerId);
  }

  // ---------------------------------------------------------------------------
  // Helper: Cart Ownership Verification
  // ---------------------------------------------------------------------------

  private assertCartOwnership(
    cart: { customerId: string | null; sessionToken: string },
    sessionToken: string,
    customerId?: string,
  ): void {
    if (customerId) {
      if (cart.customerId && cart.customerId !== customerId) {
        throw new ForbiddenException('You do not have permission to access this cart');
      }
      return;
    }

    if (cart.sessionToken !== sessionToken) {
      throw new ForbiddenException('You do not have permission to access this cart');
    }
  }
}
