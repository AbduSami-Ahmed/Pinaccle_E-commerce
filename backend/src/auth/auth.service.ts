import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthenticatedUser, UserDto } from '@pinnacle/contracts';

/**
 * AuthService — handles credential validation, token issuance, and account lifecycle.
 *
 * ⚠️  LOCAL DEV MODE ONLY — never deploy this credential flow to production.
 *     In production, AWS Cognito handles credential validation (see ADR-0007).
 */
@Injectable()
export class AuthService {
  private static readonly BCRYPT_ROUNDS = 12;
  private static readonly CUSTOMER_ROLE_KEY = 'CUSTOMER';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  async login(dto: LoginDto): Promise<{ user: UserDto; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
        isStaff: true,
        lastLoginAt: true,
        createdAt: true,
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

    if (!user || !user.passwordHash) {
      // Use a constant-time comparison to avoid timing attacks even on missing users
      await bcrypt.compare('dummy', '$2b$12$invalidhashplaceholder..............');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login timestamp (fire-and-forget, do not await in critical path)
    void this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code)),
      ),
    ] as AuthenticatedUser['permissions'];

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isStaff: user.isStaff,
      permissions,
      customerId: user.customerProfile?.id,
    };

    const token = this.jwtService.sign(payload);

    return {
      user: this.toUserDto(user),
      token,
    };
  }

  // ---------------------------------------------------------------------------
  // Customer registration (self-service)
  // ---------------------------------------------------------------------------

  async registerCustomer(dto: RegisterCustomerDto): Promise<UserDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const customerRole = await this.prisma.role.findUnique({
      where: { key: AuthService.CUSTOMER_ROLE_KEY },
    });
    if (!customerRole) {
      throw new BadRequestException('Customer role not found — run the seed script first');
    }

    const passwordHash = await bcrypt.hash(dto.password, AuthService.BCRYPT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          isStaff: false,
          userRoles: {
            create: { roleId: customerRole.id },
          },
          customerProfile: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone: dto.phone,
            },
          },
        },
        select: {
          id: true,
          email: true,
          isActive: true,
          isStaff: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });
      return created;
    });

    return this.toUserDto(user);
  }

  // ---------------------------------------------------------------------------
  // Get current user profile
  // ---------------------------------------------------------------------------

  async getMe(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        isStaff: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserDto(user);
  }

  // ---------------------------------------------------------------------------
  // Password reset (local dev — sends a new hashed password directly)
  // In production this would trigger a Cognito reset flow.
  // ---------------------------------------------------------------------------

  async resetPassword(email: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Do not reveal whether the email exists
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, AuthService.BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }

  // ---------------------------------------------------------------------------
  // Disable user (staff action)
  // ---------------------------------------------------------------------------

  async disableUser(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toUserDto(user: {
    id: string;
    email: string;
    isActive: boolean;
    isStaff: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
  }): UserDto {
    return {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
      isStaff: user.isStaff,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
