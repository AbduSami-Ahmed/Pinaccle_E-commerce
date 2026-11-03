import * as React from 'react';
import Link from 'next/link';
import { Wrench } from 'lucide-react';

export function StorefrontFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: About */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-700 text-white">
                <Wrench className="h-4 w-4" />
              </div>
              <span className="text-base font-bold tracking-tight text-slate-900">PINNACLE</span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Specialist supplier of precision-verified automotive parts. Direct commercial tyre
              inventory and safety-inspected serialized seat belts with guaranteed fitment.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-blue-700 transition-colors">
                  Storefront Home
                </Link>
              </li>
              <li>
                <Link href="/tyres" className="hover:text-blue-700 transition-colors">
                  Tyres Catalogue
                </Link>
              </li>
              <li>
                <Link href="/seat-belts" className="hover:text-blue-700 transition-colors">
                  Seat Belts Stock
                </Link>
              </li>
              <li>
                <Link href="/admin/dashboard" className="hover:text-blue-700 transition-colors">
                  Staff Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Categories */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Categories
            </h4>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <Link href="/tyres" className="hover:text-blue-700 transition-colors">
                  All Tyres (Single / Pair / Set)
                </Link>
              </li>
              <li>
                <Link href="/tyres" className="hover:text-blue-700 transition-colors">
                  Commercial Fleet Tyres
                </Link>
              </li>
              <li>
                <Link href="/seat-belts" className="hover:text-blue-700 transition-colors">
                  Front Driver & Passenger Belts
                </Link>
              </li>
              <li>
                <Link href="/seat-belts" className="hover:text-blue-700 transition-colors">
                  Rear Row Serialized Seat Belts
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Support */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Contact & Support
            </h4>
            <ul className="mt-4 space-y-2 text-xs text-slate-500">
              <li>Pinnacle Automotive Parts Ltd.</li>
              <li>14 Commercial Way, Industrial Estate</li>
              <li>support@pinnacle-parts.demo</li>
              <li>Mon - Fri: 08:00 - 17:30</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} Pinnacle Automotive Parts. All rights reserved. Demo
            e-commerce design system shell.
          </p>
        </div>
      </div>
    </footer>
  );
}
