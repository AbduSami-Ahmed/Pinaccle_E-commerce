'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/admin-layout';
import { fetchCurrentUser } from '@/lib/auth';

/**
 * Admin Root Layout
 *
 * For /admin/login: Renders standalone login view without chrome.
 * For /admin/*: Enforces staff authentication and wraps in AdminLayout (sidebar + topbar).
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  const [checkingAuth, setCheckingAuth] = React.useState(!isLoginPage);

  React.useEffect(() => {
    if (isLoginPage) {
      setCheckingAuth(false);
      return;
    }

    let isMounted = true;
    fetchCurrentUser()
      .then((user) => {
        if (!isMounted) return;
        if (!user || !user.isStaff) {
          router.replace('/admin/login');
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          router.replace('/admin/login');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isLoginPage, pathname, router]);

  // If on login route, render standalone page
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state while verifying staff session
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-mono">Verifying Staff Credentials...</span>
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}
