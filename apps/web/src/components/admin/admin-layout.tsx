'use client';

import * as React from 'react';
import { AdminSidebar } from './admin-sidebar';
import { AdminTopbar } from './admin-topbar';

export interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumb?: React.ReactNode;
}

export function AdminLayout({ children, title, breadcrumb }: AdminLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:pl-64">
      {/* Sidebar (fixed desktop, drawer mobile) */}
      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Topbar */}
      <AdminTopbar
        title={title}
        breadcrumb={breadcrumb}
        onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* Scrollable Main Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
