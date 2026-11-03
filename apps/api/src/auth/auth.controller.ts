import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser, LoginResponseDto, UserDto } from '@pinnacle/contracts';
import { ConfigService } from '@nestjs/config';

/** Cookie TTL: 7 days in milliseconds */
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // POST /auth/login
  // ---------------------------------------------------------------------------

  /**
   * ⚠️  LOCAL DEV MODE ONLY.
   * Production authentication is handled by AWS Cognito (see ADR-0007).
   * This endpoint MUST NOT be reachable in a production deployment.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[LOCAL DEV] Email + password login' })
  @ApiOkResponse({ description: 'Login successful; access_token cookie set' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    if (isProduction) {
      throw new UnauthorizedException(
        'Local login is disabled in production. Use the configured identity provider.',
      );
    }

    const { user, token } = await this.authService.login(dto);

    this.setAuthCookie(res, token);

    return { user, accessToken: token };
  }

  // ---------------------------------------------------------------------------
  // POST /auth/register
  // ---------------------------------------------------------------------------

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Customer self-registration' })
  @ApiCreatedResponse({ description: 'Account created successfully' })
  async register(@Body() dto: RegisterCustomerDto): Promise<{ user: UserDto }> {
    const user = await this.authService.registerCustomer(dto);
    return { user };
  }

  // ---------------------------------------------------------------------------
  // GET /auth/me
  // ---------------------------------------------------------------------------

  @Get('me')
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiOkResponse({ description: 'Current user profile' })
  async me(@CurrentUser() currentUser: AuthenticatedUser): Promise<{ user: UserDto }> {
    const user = await this.authService.getMe(currentUser.sub);
    return { user };
  }

  // ---------------------------------------------------------------------------
  // POST /auth/logout
  // ---------------------------------------------------------------------------

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Logout — clears the access_token cookie' })
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie('access_token', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private setAuthCookie(res: Response, token: string): void {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    });
  }
}
