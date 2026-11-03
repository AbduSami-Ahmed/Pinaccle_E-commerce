'use client';

import * as React from 'react';
import { Menu, Bell } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export interface AdminTopbarProps {
  title?: string;
  breadcrumb?: React.ReactNode;
  onMobileMenuToggle?: () => void;
}

export function AdminTopbar({ title, breadcrumb, onMobileMenuToggle }: AdminTopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger */}
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            aria-label="Open sidebar"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}

        {/* Page Title & Breadcrumb Area */}
        <div className="flex flex-col">
          {breadcrumb && <div className="text-xs text-slate-500 mb-0.5">{breadcrumb}</div>}
          {title && (
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>
          )}
        </div>
      </div>

      {/* Right side items */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <Avatar className="h-8 w-8 bg-slate-900 text-white">
            <AvatarFallback className="bg-slate-900 text-white text-xs font-semibold">
              AU
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex sm:flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-none">Admin User</span>
            <span className="text-[10px] text-slate-500">Inventory Lead</span>
          </div>
        </div>
      </div>
    </header>
  );
}
