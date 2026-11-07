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

          {/* Column 4: Trade Counter & Yard Info */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Trade Counter & Yard
            </h4>
            <ul className="mt-4 space-y-2 text-xs text-slate-500">
              <li className="font-medium text-slate-800">Pinnacle Auto Spares & Tyres</li>
              <li>42 Jedda Road, Prestons NSW 2170</li>
              <li>
                <strong className="text-slate-700">Counter Hours:</strong> Mon–Fri 7:30am – 5:00pm
              </li>
              <li>
                <strong className="text-slate-700">Saturday:</strong> 8:00am – 1:00pm (Pickups only)
              </li>
              <li>
                <strong className="text-slate-700">Parts Line:</strong> (02) 9822 4100
              </li>
              <li>
                <strong className="text-slate-700">Trade Orders:</strong>{' '}
                trade@pinnacleautospares.com.au
              </li>
            </ul>
          </div>
        </div>

        {/* Trade Badges & Compliance Strip */}
        <div className="mt-12 border-t border-slate-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-slate-700">Compliance & Trade Credentials:</span>
            <span>NSW Motor Vehicle Recycler Licence: MVRL-58291</span>
            <span>•</span>
            <span>ABN: 48 192 847 219</span>
            <span>•</span>
            <span>AS/NZS 2596 Restraint Testing Protocol</span>
          </div>

          <p className="text-slate-400">
            &copy; {new Date().getFullYear()} Pinnacle Auto Spares Pty Ltd. All mechanical &
            electrical parts backed by 30-day workshop replacement warranty.
          </p>
        </div>
      </div>
    </footer>
  );
}
