import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { PermissionCode } from '@pinnacle/contracts';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuthService = {
  login: jest.fn(),
  registerCustomer: jest.fn(),
  getMe: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockRes = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
} as unknown as Response;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
        JwtService,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Login — happy path
  // -------------------------------------------------------------------------

  describe('POST /auth/login', () => {
    it('returns 200 with user and token on valid credentials (local dev)', async () => {
      const dto: LoginDto = { email: 'admin@pinnacle.local', password: 'AdminPassword123!' };
      const stubUser = {
        id: 'user-uuid',
        email: dto.email,
        isActive: true,
        isStaff: true,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
      };
      const stubToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.stub';

      mockConfigService.get.mockReturnValue('development');
      mockAuthService.login.mockResolvedValue({ user: stubUser, token: stubToken });

      const result = await controller.login(dto, mockRes);

      expect(result.user).toEqual(stubUser);
      expect(result.accessToken).toBe(stubToken);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        stubToken,
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('throws UnauthorizedException in production mode', async () => {
      mockConfigService.get.mockReturnValue('production');
      const dto: LoginDto = { email: 'admin@pinnacle.local', password: 'AdminPassword123!' };

      await expect(controller.login(dto, mockRes)).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------

  describe('POST /auth/logout', () => {
    it('clears the access_token cookie', () => {
      const result = controller.logout(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('access_token', { path: '/' });
      expect(result.message).toContain('Logged out');
    });
  });

  // -------------------------------------------------------------------------
  // Me
  // -------------------------------------------------------------------------

  describe('GET /auth/me', () => {
    it('returns the current user profile', async () => {
      const currentUser = {
        sub: 'user-uuid',
        email: 'admin@pinnacle.local',
        isStaff: true,
        permissions: ['staff:users:view'] as PermissionCode[],
      };
      const stubUser = {
        id: 'user-uuid',
        email: 'admin@pinnacle.local',
        isActive: true,
        isStaff: true,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
      };
      mockAuthService.getMe.mockResolvedValue(stubUser);

      const result = await controller.me(currentUser);

      expect(result.user).toEqual(stubUser);
      expect(mockAuthService.getMe).toHaveBeenCalledWith('user-uuid');
    });
  });
});
