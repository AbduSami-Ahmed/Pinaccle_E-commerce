import * as React from 'react';
import { AnnouncementBar } from './announcement-bar';
import { StorefrontHeader } from './storefront-header';
import { StorefrontFooter } from './storefront-footer';

export interface StorefrontLayoutProps {
  children: React.ReactNode;
}

export function StorefrontLayout({ children }: StorefrontLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AnnouncementBar />
      <StorefrontHeader />
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
    </div>
  );
}
