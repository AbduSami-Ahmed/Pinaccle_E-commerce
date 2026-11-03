import * as React from 'react';
import { AdminLayout } from '@/components/admin/admin-layout';

/**
 * Admin Root Layout
 *
 * Backend authorization is enforced via NestJS JwtAuthGuard and PermissionsGuard.
 * For client side navigation, staff credentials are verified via httpOnly access_token cookie.
 * (Full auth redirect wiring will take place in the storefront/admin auth integration phase).
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminLayout>{children}</AdminLayout>
    </>
  );
}
