import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { CheckoutService } from './checkout.service';
import { ShippingCalculatorService } from './shipping-calculator.service';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';
import { InitiateCheckoutOrderBodyDto, ValidateCheckoutBodyDto } from './dto/checkout.dto';
import {
  AuthenticatedUser,
  CheckoutValidationResponseDto,
  OrderDetailsDto,
} from '@pinnacle/contracts';

const CART_COOKIE_NAME = 'cart_session';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly shippingCalculatorService: ShippingCalculatorService,
    private readonly inventoryService: InventoryService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // GET /checkout/shipping-methods
  // ---------------------------------------------------------------------------

  @Public()
  @Get('shipping-methods')
  @ApiOperation({ summary: 'Get available delivery and pickup shipping methods' })
  @ApiOkResponse({ description: 'List of shipping options' })
  getShippingMethods() {
    return {
      methods: this.shippingCalculatorService.getAvailableMethods(),
      depot: this.shippingCalculatorService.depotAddress,
    };
  }

  // ---------------------------------------------------------------------------
  // POST /checkout/validate
  // ---------------------------------------------------------------------------

  @Public()
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate cart stock and calculate real-time checkout totals' })
  @ApiOkResponse({ description: 'Validation results and item breakdown' })
  async validateCheckout(
    @Req() req: Request,
    @Body() dto: ValidateCheckoutBodyDto,
  ): Promise<CheckoutValidationResponseDto> {
    const { sessionToken, customerId } = await this.resolveSession(req);
    return this.checkoutService.validateCheckout(sessionToken, dto, customerId);
  }

  // ---------------------------------------------------------------------------
  // POST /checkout/orders
  // ---------------------------------------------------------------------------

  @Public()
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create order with immutable snapshots and 15-min stock reservations' })
  @ApiCreatedResponse({ description: 'Order created with pending payment' })
  async createOrder(
    @Req() req: Request,
    @Body() dto: InitiateCheckoutOrderBodyDto,
  ): Promise<{ order: OrderDetailsDto }> {
    const { sessionToken, customerId } = await this.resolveSession(req);
    const order = await this.checkoutService.createOrder(sessionToken, dto, customerId);
    return { order };
  }

  // ---------------------------------------------------------------------------
  // GET /checkout/orders/number/:orderNumber
  // ---------------------------------------------------------------------------

  @Public()
  @Get('orders/number/:orderNumber')
  @ApiOperation({ summary: 'Get order confirmation details by public order number' })
  @ApiOkResponse({ description: 'Verified order details from database' })
  async getOrderByNumber(
    @Req() req: Request,
    @Param('orderNumber') orderNumber: string,
  ): Promise<{ order: OrderDetailsDto }> {
    const { customerId } = await this.resolveSession(req);
    const order = await this.checkoutService.getOrderByNumber(orderNumber, customerId);
    return { order };
  }

  // ---------------------------------------------------------------------------
  // GET /checkout/orders/:orderId
  // ---------------------------------------------------------------------------

  @Public()
  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get order details by UUID' })
  @ApiOkResponse({ description: 'Order details' })
  async getOrderById(
    @Req() req: Request,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<{ order: OrderDetailsDto }> {
    const { customerId } = await this.resolveSession(req);
    const order = await this.checkoutService.getOrderById(orderId, customerId);
    return { order };
  }

  // ---------------------------------------------------------------------------
  // POST /checkout/reservations/sweep
  // ---------------------------------------------------------------------------

  @Public()
  @Post('reservations/sweep')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sweep expired soft stock reservations (auto-release back to inventory)',
  })
  @ApiOkResponse({ description: 'Reservations swept' })
  async sweepExpiredReservations(): Promise<{ releasedCount: number; reservationIds: string[] }> {
    return this.inventoryService.sweepExpiredReservations('CRON_SWEEP');
  }

  // ---------------------------------------------------------------------------
  // Session & Customer ID Resolver
  // ---------------------------------------------------------------------------

  private async resolveSession(
    req: Request,
  ): Promise<{ sessionToken: string; customerId?: string }> {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const headerToken = req.headers['x-cart-session'] as string | undefined;
    const sessionToken = cookies?.[CART_COOKIE_NAME] || headerToken || 'guest_default';

    let customerId: string | undefined = undefined;
    const rawJwt =
      cookies?.['access_token'] ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined);

    if (rawJwt) {
      try {
        const payload = this.jwtService.verify<AuthenticatedUser>(rawJwt);
        if (payload?.customerId) {
          customerId = payload.customerId;
        } else if (payload?.sub) {
          const profile = await this.prisma.customerProfile.findUnique({
            where: { userId: payload.sub },
            select: { id: true },
          });
          customerId = profile?.id;
        }
      } catch {
        // Guest mode fallback
      }
    }

    return { sessionToken, customerId };
  }
}
