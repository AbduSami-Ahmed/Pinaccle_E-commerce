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
  Phone,
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

    const handleCartUpdated = () => {
      fetchCart().then((c) => {
        setCartCount(c.items.length);
      });
    };

    window.addEventListener('pinnacle_cart_updated', handleCartUpdated);
    return () => window.removeEventListener('pinnacle_cart_updated', handleCartUpdated);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearch.trim()) {
      router.push(`/search?search=${encodeURIComponent(navSearch.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
      {/* Top Utility Bar */}
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-xs text-slate-600">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="hidden sm:inline-flex items-center gap-1.5 font-medium text-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Registered NZ Motor Vehicle Trader · Penrose Auckland Hub</span>
            </span>
            <span className="hidden md:inline text-slate-400">|</span>
            <span className="hidden md:inline text-slate-500">
              Orders before 2:00 PM NZST dispatch same day
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <a
              href="tel:0800746622"
              className="flex items-center gap-1.5 font-bold text-slate-800 hover:text-blue-700 transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-blue-600" />
              <span>0800 PINNACLE (0800 746 622)</span>
            </a>
            <span className="text-slate-300">|</span>
            <Link
              href="/admin/login"
              className="text-slate-600 hover:text-blue-700 font-medium transition-colors"
            >
              Staff Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        {/* Mobile menu trigger */}
        <div className="flex items-center lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open mobile navigation menu"
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Brand / Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                PINNACLE
              </span>
              <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                Auto Spares &amp; Tyres
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex lg:items-center lg:space-x-1 text-sm font-semibold text-slate-700">
            {/* Tyres Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setTyresDropdownOpen(true)}
              onMouseLeave={() => setTyresDropdownOpen(false)}
            >
              <Link
                href="/tyres"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-blue-700 transition-colors"
              >
                <Disc className="h-4 w-4 text-slate-500" />
                <span>Commercial Tyres</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              {tyresDropdownOpen && (
                <div className="absolute left-0 top-full pt-1 z-50">
                  <div className="w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    <Link
                      href="/tyres"
                      className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-blue-700"
                    >
                      All Tyres (Single / Pair / Set of 4)
                    </Link>
                    <Link
                      href="/tyres?terrain=HIGHWAY"
                      className="block rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-blue-700"
                    >
                      Passenger &amp; Highway Terrain
                    </Link>
                    <Link
                      href="/tyres?terrain=COMMERCIAL_CARGO"
                      className="block rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-blue-700"
                    >
                      Commercial Light Truck &amp; Van
                    </Link>
                    <div className="my-1 border-t border-slate-100" />
                    <Link
                      href="/tyres?sectionWidth=205&aspectRatio=55&rimDiameter=16"
                      className="block rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 hover:text-blue-700"
                    >
                      Popular: 205/55 R16
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/seat-belts"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-blue-700 transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Tested Seat Belts</span>
            </Link>

            <Link
              href="/fitment"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700 transition-colors"
            >
              <span>Fitment Finder</span>
            </Link>
          </nav>
        </div>

        {/* Global Search Bar (Desktop Center) */}
        <div className="hidden flex-1 max-w-md lg:block">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              aria-label="Search parts"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Search tyre size (e.g. 205/55R16), part #, or rego..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50/70 py-2 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
            />
          </form>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/account"
            aria-label="Customer Account"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 hover:text-blue-700 transition-colors"
          >
            <User className="h-5 w-5" />
          </Link>

          <Link
            href="/cart"
            aria-label="Parts Cart"
            className="relative flex h-9 items-center gap-2 rounded-lg bg-slate-100 px-3 text-slate-800 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="text-xs font-bold">Cart</span>
            {cartCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white shadow-xl flex flex-col">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <span className="font-extrabold text-slate-900">PINNACLE AUTO</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <form
                onSubmit={(e) => {
                  handleSearchSubmit(e);
                  setMobileMenuOpen(false);
                }}
              >
                <input
                  type="search"
                  aria-label="Search parts"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  placeholder="Search tyre size or part #..."
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </form>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Home
              </Link>
              <Link
                href="/tyres"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Commercial Tyres
              </Link>
              <Link
                href="/seat-belts"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Tested Seat Belts
              </Link>
              <Link
                href="/fitment"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Fitment Finder
              </Link>
              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Cart ({cartCount})
              </Link>
              <div className="pt-4 border-t border-slate-100">
                <Link
                  href="/admin/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50"
                >
                  Staff Admin Portal &rarr;
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
