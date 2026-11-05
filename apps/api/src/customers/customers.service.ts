import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
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
}
