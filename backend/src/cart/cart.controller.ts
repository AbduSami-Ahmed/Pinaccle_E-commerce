import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';
import { AuthenticatedUser, CartDto } from '@pinnacle/contracts';
import { AddItemBodyDto, MergeCartBodyDto, UpdateQuantityBodyDto } from './dto/cart-requests.dto';

const CART_COOKIE_NAME = 'cart_session';
const CART_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // GET /cart
  // ---------------------------------------------------------------------------

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get active cart with real-time recalculated prices and stock' })
  @ApiOkResponse({ description: 'Active cart detail' })
  async getCart(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ cart: CartDto }> {
    const { sessionToken, customerId } = await this.resolveSession(req, res);
    const cart = await this.cartService.getCart(sessionToken, customerId);
    return { cart };
  }

  // ---------------------------------------------------------------------------
  // POST /cart/items
  // ---------------------------------------------------------------------------

  @Public()
  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiCreatedResponse({ description: 'Updated cart' })
  async addItem(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AddItemBodyDto,
  ): Promise<{ cart: CartDto }> {
    const { sessionToken, customerId } = await this.resolveSession(req, res);
    const cart = await this.cartService.addItem(sessionToken, dto, customerId);
    return { cart };
  }

  // ---------------------------------------------------------------------------
  // PATCH /cart/items/:itemId
  // ---------------------------------------------------------------------------

  @Public()
  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item pack quantity' })
  @ApiOkResponse({ description: 'Updated cart' })
  async updateItemQuantity(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateQuantityBodyDto,
  ): Promise<{ cart: CartDto }> {
    const { sessionToken, customerId } = await this.resolveSession(req, res);
    const cart = await this.cartService.updateItemQuantity(
      sessionToken,
      itemId,
      dto.quantity,
      customerId,
    );
    return { cart };
  }

  // ---------------------------------------------------------------------------
  // DELETE /cart/items/:itemId
  // ---------------------------------------------------------------------------

  @Public()
  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiOkResponse({ description: 'Updated cart' })
  async removeItem(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<{ cart: CartDto }> {
    const { sessionToken, customerId } = await this.resolveSession(req, res);
    const cart = await this.cartService.removeItem(sessionToken, itemId, customerId);
    return { cart };
  }

  // ---------------------------------------------------------------------------
  // DELETE /cart
  // ---------------------------------------------------------------------------

  @Public()
  @Delete()
  @ApiOperation({ summary: 'Clear all items in cart' })
  @ApiOkResponse({ description: 'Empty cart' })
  async clearCart(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ cart: CartDto }> {
    const { sessionToken, customerId } = await this.resolveSession(req, res);
    const cart = await this.cartService.clearCartSession(sessionToken, customerId);
    return { cart };
  }

  // ---------------------------------------------------------------------------
  // POST /cart/merge
  // ---------------------------------------------------------------------------

  @Public()
  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge guest cart into authenticated customer cart on login' })
  @ApiOkResponse({ description: 'Merged customer cart' })
  async mergeCart(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: MergeCartBodyDto,
  ): Promise<{ cart: CartDto }> {
    const { customerId } = await this.resolveSession(req, res);

    if (!customerId) {
      throw new UnauthorizedException('Authentication required to merge cart');
    }

    const cart = await this.cartService.mergeGuestCart(dto.guestSessionToken, customerId);
    return { cart };
  }

  // ---------------------------------------------------------------------------
  // Session & Customer ID Resolver
  // ---------------------------------------------------------------------------

  private async resolveSession(
    req: Request,
    res: Response,
  ): Promise<{ sessionToken: string; customerId?: string }> {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const headerToken = req.headers['x-cart-session'] as string | undefined;
    let sessionToken = cookies?.[CART_COOKIE_NAME] || headerToken;

    if (!sessionToken) {
      sessionToken = `sess_${randomUUID()}`;
      res.cookie(CART_COOKIE_NAME, sessionToken, {
        httpOnly: false, // Allow client scripts to read for headers/fallbacks
        sameSite: 'lax',
        maxAge: CART_COOKIE_MAX_AGE_MS,
        path: '/',
      });
    }

    // Try extracting customerId from JWT
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
        // Expired or invalid token — proceed as guest
      }
    }

    return { sessionToken, customerId };
  }
}
