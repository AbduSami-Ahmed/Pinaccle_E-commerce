import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminCustomerDetailDto,
  AdminCustomerListItemDto,
  AuthenticatedUser,
  CustomerProfileDto,
  CustomerAddressDto,
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
  UpdateCustomerProfileDto,
} from '@pinnacle/contracts';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------

  async getProfileByUserId(userId: string): Promise<CustomerProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: {
          include: {
            addresses: {
              where: { isDefault: true },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!user || !user.customerProfile) {
      throw new NotFoundException('Customer profile not found for user');
    }

    const cp = user.customerProfile;
    const defaultAddressId = cp.addresses[0]?.id ?? null;

    return {
      id: cp.id,
      userId: user.id,
      email: user.email,
      firstName: cp.firstName,
      lastName: cp.lastName,
      phone: cp.phone,
      accountType: cp.accountType as CustomerProfileDto['accountType'],
      isActive: user.isActive,
      createdAt: cp.createdAt.toISOString(),
      updatedAt: cp.updatedAt.toISOString(),
      defaultAddressId,
    };
  }

  async getProfileByCustomerId(customerId: string): Promise<CustomerProfileDto> {
    const cp = await this.prisma.customerProfile.findUnique({
      where: { id: customerId },
      include: {
        user: { select: { id: true, email: true, isActive: true } },
        addresses: {
          where: { isDefault: true },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!cp) {
      throw new NotFoundException(`Customer profile ${customerId} not found`);
    }

    return {
      id: cp.id,
      userId: cp.user.id,
      email: cp.user.email,
      firstName: cp.firstName,
      lastName: cp.lastName,
      phone: cp.phone,
      accountType: cp.accountType as CustomerProfileDto['accountType'],
      isActive: cp.user.isActive,
      createdAt: cp.createdAt.toISOString(),
      updatedAt: cp.updatedAt.toISOString(),
      defaultAddressId: cp.addresses[0]?.id ?? null,
    };
  }

  async updateProfileByUserId(
    userId: string,
    dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: true },
    });

    if (!user || !user.customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    const updated = await this.prisma.customerProfile.update({
      where: { id: user.customerProfile.id },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
      },
      include: {
        addresses: {
          where: { isDefault: true },
          select: { id: true },
          take: 1,
        },
      },
    });

    return {
      id: updated.id,
      userId: user.id,
      email: user.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      accountType: updated.accountType as CustomerProfileDto['accountType'],
      isActive: user.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      defaultAddressId: updated.addresses[0]?.id ?? null,
    };
  }

  // ---------------------------------------------------------------------------
  // Addresses
  // ---------------------------------------------------------------------------

  async getAddresses(customerId: string): Promise<CustomerAddressDto[]> {
    const addresses = await this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return addresses.map(this.toAddressDto);
  }

  async createAddress(
    customerId: string,
    dto: CreateCustomerAddressDto,
  ): Promise<CustomerAddressDto> {
    const existingCount = await this.prisma.customerAddress.count({
      where: { customerId },
    });

    const isFirst = existingCount === 0;
    const shouldBeDefault = dto.isDefault ?? isFirst;

    if (shouldBeDefault && existingCount > 0) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.customerAddress.create({
      data: {
        customerId,
        label: dto.label?.trim() || null,
        line1: dto.line1.trim(),
        line2: dto.line2?.trim() || null,
        city: dto.city.trim(),
        state: dto.state.trim().toUpperCase(),
        postalCode: dto.postalCode.trim(),
        country: (dto.country || 'AU').trim().toUpperCase(),
        isDefault: shouldBeDefault,
      },
    });

    return this.toAddressDto(address);
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ): Promise<CustomerAddressDto> {
    const existing = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!existing) {
      throw new NotFoundException(`Address ${addressId} not found`);
    }

    if (existing.customerId !== customerId) {
      throw new ForbiddenException('You do not have permission to modify this address');
    }

    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() || null } : {}),
        ...(dto.line1 !== undefined ? { line1: dto.line1.trim() } : {}),
        ...(dto.line2 !== undefined ? { line2: dto.line2.trim() || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
        ...(dto.state !== undefined ? { state: dto.state.trim().toUpperCase() } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode.trim() } : {}),
        ...(dto.country !== undefined ? { country: dto.country.trim().toUpperCase() } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });

    return this.toAddressDto(updated);
  }

  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    const existing = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!existing) {
      throw new NotFoundException(`Address ${addressId} not found`);
    }

    if (existing.customerId !== customerId) {
      throw new ForbiddenException('You do not have permission to delete this address');
    }

    await this.prisma.customerAddress.delete({
      where: { id: addressId },
    });

    // If the deleted address was default, promote the newest remaining address to default
    if (existing.isDefault) {
      const nextDefault = await this.prisma.customerAddress.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });

      if (nextDefault) {
        await this.prisma.customerAddress.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private helper
  // ---------------------------------------------------------------------------

  private toAddressDto(address: {
    id: string;
    customerId: string;
    label: string | null;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CustomerAddressDto {
    return {
      id: address.id,
      customerId: address.customerId,
      label: address.label,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Staff Customer Directory & Detail
  // ---------------------------------------------------------------------------

  async searchCustomers(
    query: { search?: string; page?: number; limit?: number },
    user: AuthenticatedUser,
  ): Promise<{
    customers: AdminCustomerListItemDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const hasPii = user.permissions.includes('customers:view:pii_contact');

    const where: any = {};
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, profiles] = await Promise.all([
      this.prisma.customerProfile.count({ where }),
      this.prisma.customerProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, createdAt: true } },
          orders: {
            where: { orderStatus: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
            select: { totalAmount: true },
          },
        },
      }),
    ]);

    const customers: AdminCustomerListItemDto[] = profiles.map((p) => {
      const rawEmail = p.user.email;
      const rawPhone = p.phone;
      const ordersCount = p.orders.length;
      const totalSpend = Number(
        p.orders.reduce((sum: number, ord: { totalAmount: any }) => sum + Number(ord.totalAmount), 0).toFixed(2),
      );

      return {
        id: p.id,
        userId: p.userId,
        firstName: p.firstName,
        lastName: p.lastName,
        displayName: `${p.firstName} ${p.lastName}`.trim(),
        email: hasPii ? rawEmail : this.maskEmail(rawEmail),
        phone: hasPii ? rawPhone : this.maskPhone(rawPhone),
        companyName: p.accountType === 'TRADE_COMMERCIAL' ? 'Trade Account' : null,
        ordersCount,
        totalSpend,
        isPiiMasked: !hasPii,
        createdAt: p.createdAt.toISOString(),
      };
    });

    return {
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCustomerDetail(
    customerId: string,
    user: AuthenticatedUser,
  ): Promise<AdminCustomerDetailDto> {
    const hasPii = user.permissions.includes('customers:view:pii_contact');

    const profile = await this.prisma.customerProfile.findUnique({
      where: { id: customerId },
      include: {
        user: { select: { id: true, email: true, createdAt: true } },
        addresses: { orderBy: { createdAt: 'desc' } },
        savedVehicles: {
          include: {
            vehicleChassis: {
              include: {
                generation: {
                  include: {
                    model: {
                      include: {
                        make: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            orderStatus: true,
            paymentStatus: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Customer profile ${customerId} not found`);
    }

    const rawEmail = profile.user.email;
    const rawPhone = profile.phone;
    const paidOrders = profile.orders.filter((o) =>
      ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.orderStatus),
    );
    const totalSpend = Number(
      paidOrders.reduce((sum: number, ord: { totalAmount: any }) => sum + Number(ord.totalAmount), 0).toFixed(2),
    );

    const addresses = profile.addresses.map((a) => {
      const dto = this.toAddressDto(a);
      if (!hasPii) {
        dto.line1 = '[PROTECTED RESIDENTIAL ADDRESS]';
        dto.line2 = null;
      }
      return dto;
    });

    const savedVehicles = profile.savedVehicles.map((v) => {
      const chassis = v.vehicleChassis;
      const gen = chassis?.generation;
      const model = gen?.model;
      const make = model?.make;
      return {
        id: v.id,
        make: make?.name ?? 'Unknown Make',
        model: model?.name ?? 'Unknown Model',
        year: gen?.yearStart ?? 0,
        variant: chassis?.chassisCode || chassis?.bodyType || undefined,
      };
    });

    const recentOrders = profile.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.orderStatus as any,
      paymentStatus: o.paymentStatus as any,
      total: Number(o.totalAmount),
      createdAt: o.createdAt.toISOString(),
    }));

    return {
      id: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: `${profile.firstName} ${profile.lastName}`.trim(),
      email: hasPii ? rawEmail : this.maskEmail(rawEmail),
      phone: hasPii ? rawPhone : this.maskPhone(rawPhone),
      companyName: profile.accountType === 'TRADE_COMMERCIAL' ? 'Trade Account' : null,
      ordersCount: profile.orders.length,
      totalSpend,
      isPiiMasked: !hasPii,
      addresses,
      savedVehicles,
      recentOrders,
      createdAt: profile.createdAt.toISOString(),
    };
  }

  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.***';
    const user = parts[0] ?? '';
    const visibleChar = user.length > 0 ? user[0]! : '*';
    return `${visibleChar}***@${parts[1]}`;
  }

  private maskPhone(phone?: string | null): string {
    if (!phone) return '—';
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) return '••••';
    return `+61 •••• •••• ${digits.slice(-4)}`;
  }
}
