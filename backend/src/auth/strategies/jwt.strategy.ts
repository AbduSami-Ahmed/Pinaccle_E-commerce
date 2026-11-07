import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '@pinnacle/contracts';

/**
 * JWT strategy — validates tokens issued by this service (local-dev HS256 mode).
 *
 * Token extraction order:
 *   1. Authorization: Bearer <token>  (API clients, Swagger UI)
 *   2. access_token httpOnly cookie   (browser storefront / admin)
 *
 * After signature validation, we load the user's current active status from the
 * database and rebuild the permissions set from the DB (not trusted from the token
 * in production — token permissions are used only for local-dev convenience).
 *
 * In Cognito mode (AUTH_PROVIDER=cognito) this strategy would be replaced by
 * a JWKS-backed RS256 strategy — see ADR-0007 for migration path.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const options: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Bearer token (Authorization header)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // 2. httpOnly cookie
        (req: Request): string | null => {
          const cookie = (req.cookies as Record<string, string | undefined>)['access_token'];
          return cookie ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    };

    super(options);
  }

  /**
   * Called after passport validates the JWT signature and expiry.
   * We re-check isActive and reload permissions from the DB so that
   * deactivating a user takes effect immediately (not at token expiry).
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        isStaff: true,
        customerProfile: { select: { id: true } },
        userRoles: {
          select: {
            role: {
              select: {
                permissions: {
                  select: {
                    permission: { select: { code: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is inactive or not found');
    }

    // Flatten permission codes from the role graph
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code)),
      ),
    ];

    return {
      sub: user.id,
      email: user.email,
      isStaff: user.isStaff,
      permissions: permissions as AuthenticatedUser['permissions'],
      customerId: user.customerProfile?.id,
    };
  }
}
