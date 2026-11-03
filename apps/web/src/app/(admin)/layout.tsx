import * as React from 'react';
import { AdminLayout } from '@/components/admin/admin-layout';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* DEMO: no authentication guard yet */}
      <AdminLayout>{children}</AdminLayout>
    </>
  );
}
