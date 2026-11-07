import * as React from 'react';
import { StorefrontLayout } from '@/components/storefront/storefront-layout';

export default function StorefrontRootLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontLayout>{children}</StorefrontLayout>;
}
