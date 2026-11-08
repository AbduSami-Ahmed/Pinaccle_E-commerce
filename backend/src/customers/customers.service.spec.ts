import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: {
    user: { findUnique: jest.Mock };
    customerProfile: { findUnique: jest.Mock; update: jest.Mock };
    customerAddress: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      customerProfile: { findUnique: jest.fn(), update: jest.fn() },
      customerAddress: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  describe('getProfileByUserId', () => {
    it('returns customer profile with email and default address', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        isActive: true,
        customerProfile: {
          id: 'cust-1',
          firstName: 'John',
          lastName: 'Doe',
          phone: '0412345678',
          accountType: 'RETAIL',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-02'),
          addresses: [{ id: 'addr-1' }],
        },
      });

      const result = await service.getProfileByUserId('user-1');

      expect(result.id).toBe('cust-1');
      expect(result.email).toBe('customer@example.com');
      expect(result.defaultAddressId).toBe('addr-1');
    });

    it('throws NotFoundException if profile does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'staff@example.com',
        customerProfile: null,
      });

      await expect(service.getProfileByUserId('user-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfileByUserId', () => {
    it('updates permitted profile fields', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        isActive: true,
        customerProfile: { id: 'cust-1' },
      });

      prisma.customerProfile.update.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '0498765432',
        accountType: 'RETAIL',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-03'),
        addresses: [],
      });

      const result = await service.updateProfileByUserId('user-1', {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '0498765432',
      });

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(prisma.customerProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cust-1' },
          data: { firstName: 'Jane', lastName: 'Smith', phone: '0498765432' },
        }),
      );
    });
  });

  describe('address management & ownership', () => {
    it('creates address and makes it default if it is the first address', async () => {
      prisma.customerAddress.count.mockResolvedValue(0);
      prisma.customerAddress.create.mockResolvedValue({
        id: 'addr-1',
        customerId: 'cust-1',
        label: 'Workshop',
        line1: '18 Industry Road',
        line2: null,
        city: 'Penrose',
        state: 'Auckland',
        postalCode: '1061',
        country: 'NZ',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createAddress('cust-1', {
        label: 'Workshop',
        line1: '18 Industry Road',
        city: 'Penrose',
        state: 'Auckland',
        postalCode: '1061',
      });

      expect(result.isDefault).toBe(true);
      expect(prisma.customerAddress.create).toHaveBeenCalled();
    });

    it('rejects update if address belongs to another customer (ForbiddenException)', async () => {
      prisma.customerAddress.findUnique.mockResolvedValue({
        id: 'addr-99',
        customerId: 'cust-OTHER',
        line1: '100 Other St',
      });

      await expect(
        service.updateAddress('cust-ME', 'addr-99', { line1: 'Tampered Address' }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.customerAddress.update).not.toHaveBeenCalled();
    });

    it('rejects deletion if address belongs to another customer (ForbiddenException)', async () => {
      prisma.customerAddress.findUnique.mockResolvedValue({
        id: 'addr-99',
        customerId: 'cust-OTHER',
      });

      await expect(service.deleteAddress('cust-ME', 'addr-99')).rejects.toThrow(ForbiddenException);

      expect(prisma.customerAddress.delete).not.toHaveBeenCalled();
    });

    it('deletes own address successfully', async () => {
      prisma.customerAddress.findUnique.mockResolvedValue({
        id: 'addr-1',
        customerId: 'cust-1',
        isDefault: false,
      });
      prisma.customerAddress.delete.mockResolvedValue({});

      await service.deleteAddress('cust-1', 'addr-1');

      expect(prisma.customerAddress.delete).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
      });
    });
  });
});
