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
                <Link href="/admin/login" className="hover:text-blue-700 transition-colors">
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
              Trade Counter & Hub
            </h4>
            <ul className="mt-4 space-y-2 text-xs text-slate-500">
              <li className="font-medium text-slate-800">Pinnacle Auto Spares &amp; Tyres Ltd</li>
              <li>18 Industry Road, Penrose, Auckland 1061</li>
              <li>
                <strong className="text-slate-700">Counter Hours:</strong> Mon–Fri 7:30am – 5:00pm NZST
              </li>
              <li>
                <strong className="text-slate-700">Saturday:</strong> 8:00am – 1:00pm NZST (Pickups only)
              </li>
              <li>
                <strong className="text-slate-700">Parts Line:</strong> (09) 525 8890 | 0800 PINNACLE
              </li>
              <li>
                <strong className="text-slate-700">Trade Orders:</strong>{' '}
                trade@pinnacleparts.co.nz
              </li>
            </ul>
          </div>
        </div>

        {/* Trade Badges & Compliance Strip */}
        <div className="mt-12 border-t border-slate-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-slate-700">Compliance &amp; Trade Credentials:</span>
            <span>Registered Motor Vehicle Trader: MVD-89211</span>
            <span>•</span>
            <span>NZBN: 9429041234567</span>
            <span>•</span>
            <span>GST No: 123-456-789</span>
            <span>•</span>
            <span>AS/NZS 2596 Restraint Testing Protocol</span>
          </div>

          <p className="text-slate-400">
            &copy; {new Date().getFullYear()} Pinnacle Auto Spares &amp; Commercial Tyres Ltd. All mechanical &amp;
            electrical parts backed by 90-day workshop replacement warranty under NZ CGA 1993.
          </p>
        </div>
      </div>
    </footer>
  );
}
