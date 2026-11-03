'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  Barcode,
  ShoppingBag,
  Truck,
  Users,
  RotateCcw,
  Settings,
  UserCheck,
  FileText,
  Wrench,
  X,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavSection {
  title: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Catalogue',
    items: [
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Categories', href: '/admin/categories', icon: Layers },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Stock Management', href: '/admin/inventory', icon: Boxes },
      { label: 'Serialized Items', href: '/admin/serialized-items', icon: Barcode },
    ],
  },
  {
    title: 'Orders',
    items: [
      { label: 'All Orders', href: '/admin/orders', icon: ShoppingBag },
      { label: 'Fulfillment', href: '/admin/fulfillment', icon: Truck },
    ],
  },
  {
    title: 'Customers',
    items: [
      { label: 'Customer List', href: '/admin/customers', icon: Users },
      { label: 'Returns', href: '/admin/returns', icon: RotateCcw },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Store Settings', href: '/admin/settings', icon: Settings },
      { label: 'Staff & Roles', href: '/admin/staff', icon: UserCheck },
      { label: 'Audit Log', href: '/admin/audit-log', icon: FileText },
    ],
  },
];

export function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white shadow-sm">
            <Wrench className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-white text-sm">PINNACLE ADMIN</span>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider">
              OPERATIONS v0.2
            </span>
          </div>
        </Link>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close sidebar"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <h4 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {section.title}
            </h4>
            <div className="space-y-0.5 pt-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      'group flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-white',
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Storefront return link */}
      <div className="border-t border-slate-800 p-3">
        <Link
          href="/"
          className="flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            <span>Storefront Front</span>
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
            Public
          </span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile drawer sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={onMobileClose} />
          <div className="fixed inset-y-0 left-0 w-64 max-w-xs shadow-xl">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
