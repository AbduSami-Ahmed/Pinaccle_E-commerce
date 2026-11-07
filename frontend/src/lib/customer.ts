/**
 * Customer Account Client API (Phase 10)
 * Communicates with /api/customers/* endpoints.
 */

import {
  CustomerAddressDto,
  CustomerProfileDto,
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
  UpdateCustomerProfileDto,
} from '@pinnacle/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Realistic local dev fallback
const DEV_FALLBACK_PROFILE: CustomerProfileDto = {
  id: 'cust-prestons-01',
  userId: 'usr-customer-dev',
  email: 'trade@prestonsmechanical.com.au',
  firstName: 'David',
  lastName: 'Miller',
  phone: '0412 890 123',
  accountType: 'TRADE',
  isActive: true,
  createdAt: '2026-01-15T08:00:00.000Z',
  updatedAt: '2026-03-01T10:30:00.000Z',
  defaultAddressId: 'addr-dev-01',
};

const DEV_FALLBACK_ADDRESSES: CustomerAddressDto[] = [
  {
    id: 'addr-dev-01',
    customerId: 'cust-prestons-01',
    label: 'Main Workshop & Fitting Bay',
    line1: '18 Jedda Road',
    line2: 'Unit 3',
    city: 'Prestons',
    state: 'NSW',
    postalCode: '2170',
    country: 'AU',
    isDefault: true,
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'addr-dev-02',
    customerId: 'cust-prestons-01',
    label: 'Liverpool Trade Receiving',
    line1: '94 Hoxton Park Road',
    line2: null,
    city: 'Liverpool',
    state: 'NSW',
    postalCode: '2170',
    country: 'AU',
    isDefault: false,
    createdAt: '2026-02-10T14:20:00.000Z',
    updatedAt: '2026-02-10T14:20:00.000Z',
  },
];

let inMemoryAddresses = [...DEV_FALLBACK_ADDRESSES];
let inMemoryProfile = { ...DEV_FALLBACK_PROFILE };

export async function fetchCustomerProfile(): Promise<CustomerProfileDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/profile`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return data.profile;
    }
  } catch {
    // Fall through to dev fallback
  }

  return inMemoryProfile;
}

export async function updateCustomerProfile(
  dto: UpdateCustomerProfileDto,
): Promise<CustomerProfileDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/profile`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      const data = await res.json();
      return data.profile;
    }
  } catch {
    // Fall through to dev fallback
  }

  inMemoryProfile = {
    ...inMemoryProfile,
    ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
    ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
    ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
    updatedAt: new Date().toISOString(),
  };

  return inMemoryProfile;
}

export async function fetchCustomerAddresses(): Promise<CustomerAddressDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return data.addresses;
    }
  } catch {
    // Fall through to dev fallback
  }

  return inMemoryAddresses;
}

export async function createCustomerAddress(
  dto: CreateCustomerAddressDto,
): Promise<CustomerAddressDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      const data = await res.json();
      return data.address;
    }
  } catch {
    // Fall through to dev fallback
  }

  const isDefault = dto.isDefault ?? inMemoryAddresses.length === 0;
  if (isDefault) {
    inMemoryAddresses = inMemoryAddresses.map((a) => ({ ...a, isDefault: false }));
  }

  const newAddress: CustomerAddressDto = {
    id: `addr-${Date.now()}`,
    customerId: inMemoryProfile.id,
    label: dto.label || null,
    line1: dto.line1,
    line2: dto.line2 || null,
    city: dto.city,
    state: dto.state,
    postalCode: dto.postalCode,
    country: dto.country || 'AU',
    isDefault,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryAddresses = [newAddress, ...inMemoryAddresses];
  return newAddress;
}

export async function updateCustomerAddress(
  addressId: string,
  dto: UpdateCustomerAddressDto,
): Promise<CustomerAddressDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses/${addressId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (res.ok) {
      const data = await res.json();
      return data.address;
    }
  } catch {
    // Fall through to dev fallback
  }

  if (dto.isDefault) {
    inMemoryAddresses = inMemoryAddresses.map((a) => ({
      ...a,
      isDefault: a.id === addressId,
    }));
  }

  const target = inMemoryAddresses.find((a) => a.id === addressId);
  if (!target) {
    throw new Error('Address not found');
  }

  const updated: CustomerAddressDto = {
    ...target,
    ...(dto.label !== undefined ? { label: dto.label || null } : {}),
    ...(dto.line1 !== undefined ? { line1: dto.line1 } : {}),
    ...(dto.line2 !== undefined ? { line2: dto.line2 || null } : {}),
    ...(dto.city !== undefined ? { city: dto.city } : {}),
    ...(dto.state !== undefined ? { state: dto.state } : {}),
    ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
    ...(dto.country !== undefined ? { country: dto.country } : {}),
    ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
    updatedAt: new Date().toISOString(),
  };

  inMemoryAddresses = inMemoryAddresses.map((a) => (a.id === addressId ? updated : a));
  return updated;
}

export async function deleteCustomerAddress(addressId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/customers/me/addresses/${addressId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (res.ok) {
      return;
    }
  } catch {
    // Fall through to dev fallback
  }

  inMemoryAddresses = inMemoryAddresses.filter((a) => a.id !== addressId);
}
