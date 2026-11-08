'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  ChevronDown,
  Wrench,
  ShieldCheck,
  Disc,
} from 'lucide-react';
import { fetchCart } from '@/lib/cart';

export function StorefrontHeader() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [tyresDropdownOpen, setTyresDropdownOpen] = React.useState(false);
  const [navSearch, setNavSearch] = React.useState('');
  const [cartCount, setCartCount] = React.useState<number>(0);

  React.useEffect(() => {
    fetchCart().then((c) => {
      setCartCount(c.items.length);
    });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearch.trim()) {
      router.push(`/search?search=${encodeURIComponent(navSearch.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Mobile menu trigger */}
        <div className="flex items-center lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open mobile navigation menu"
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-700 text-white shadow-sm transition-transform group-hover:scale-105">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                PINNACLE
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Auto Spares & Tyres
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:ml-8 lg:flex lg:items-center lg:space-x-6 text-sm font-medium text-slate-700">
            <div
              className="relative"
              onMouseEnter={() => setTyresDropdownOpen(true)}
              onMouseLeave={() => setTyresDropdownOpen(false)}
            >
              <Link
                href="/tyres"
                className="inline-flex items-center gap-1 py-2 hover:text-blue-700 transition-colors"
              >
                <Disc className="h-4 w-4 text-slate-500" />
                <span>Commercial Tyres</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              {tyresDropdownOpen && (
                <div className="absolute left-0 top-full w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                  <Link
                    href="/tyres"
                    className="block rounded-sm px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-blue-700"
                  >
                    All Tyres (Single / Pair / Set)
                  </Link>
                  <Link
                    href="/tyres?terrain=HIGHWAY"
                    className="block rounded-sm px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                  >
                    Passenger & Highway Terrain
                  </Link>
                  <Link
                    href="/tyres?terrain=COMMERCIAL_CARGO"
                    className="block rounded-sm px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                  >
                    Commercial Light Truck & Van
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/seat-belts"
              className="inline-flex items-center gap-1.5 py-2 hover:text-blue-700 transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              <span>Tested Seat Belts</span>
            </Link>

            <Link
              href="/fitment"
              className="inline-flex items-center gap-1.5 py-2 hover:text-blue-700 transition-colors text-slate-600"
            >
              <span>Vehicle Fitment Finder</span>
            </Link>
          </nav>
        </div>

        {/* Global Search Bar (Desktop) */}
        <div className="hidden flex-1 max-w-md mx-6 lg:block">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="search"
              aria-label="Search parts"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Search tyre size (e.g. 205/55R16), OEM #, stock ID..."
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3.5 py-1.5 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="absolute right-1 top-1 bottom-1 flex items-center px-2.5 text-slate-400 hover:text-blue-700"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link
            href="/admin/login"
            className="hidden sm:inline-flex text-xs font-semibold text-slate-600 hover:text-blue-700 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50"
          >
            Staff Portal
          </Link>

          <Link
            href="/account"
            aria-label="Customer Account"
            className="rounded-full p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            <User className="h-5 w-5" />
          </Link>

          <Link
            href="/cart"
            aria-label="Parts Cart"
            className="relative rounded-full p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-700 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white shadow-xl flex flex-col">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-700 text-white">
                  <Wrench className="h-4 w-4" />
                </div>
                <span className="font-bold text-slate-900">PINNACLE</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile Search */}
            <div className="p-4 border-b border-slate-200">
              <form
                onSubmit={(e) => {
                  handleSearchSubmit(e);
                  setMobileMenuOpen(false);
                }}
                className="relative"
              >
                <input
                  type="search"
                  aria-label="Search parts"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  placeholder="Search parts, tyre spec..."
                  className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />
                <button
                  type="submit"
                  aria-label="Submit search"
                  className="absolute right-2.5 top-2 text-slate-400"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Mobile links */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                Home
              </Link>
              <Link
                href="/tyres"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                Tyres Catalogue
              </Link>
              <Link
                href="/seat-belts"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                Seat Belts (Serialized)
              </Link>
              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                <span>Parts Cart</span>
                {cartCount > 0 && (
                  <span className="rounded-full bg-blue-700 px-2 py-0.5 text-xs text-white font-bold">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                Customer Account
              </Link>
              <div className="pt-4 border-t border-slate-200">
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  Admin Portal &rarr;
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
