'use client';

import * as React from 'react';
import { Menu, Bell, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { fetchCurrentUser, logoutUser } from '@/lib/auth';

export interface AdminTopbarProps {
  title?: string;
  breadcrumb?: React.ReactNode;
  onMobileMenuToggle?: () => void;
}

export function AdminTopbar({ title, breadcrumb, onMobileMenuToggle }: AdminTopbarProps) {
  const [currentUserEmail, setCurrentUserEmail] = React.useState<string>('zayd@gmail.com');

  React.useEffect(() => {
    let mounted = true;
    void fetchCurrentUser().then((user) => {
      if (mounted && user?.email) {
        setCurrentUserEmail(user.email);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const initials = currentUserEmail.startsWith('zayd')
    ? 'ZM'
    : currentUserEmail.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logoutUser();
    window.location.href = '/admin/login';
  };
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
          <Avatar className="h-8 w-8 bg-blue-600 text-white">
            <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex sm:flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-none">
              {currentUserEmail.startsWith('zayd') ? 'Zayd Mirza' : 'Staff Member'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
              {currentUserEmail}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            title="Sign out of Staff Portal"
            className="ml-2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
