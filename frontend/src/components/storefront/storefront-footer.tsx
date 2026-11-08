import * as React from 'react';
import Link from 'next/link';
import { Wrench, Phone, Mail, MapPin, Clock } from 'lucide-react';

export function StorefrontFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: About & Credentials */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
                <Wrench className="h-4 w-4" />
              </div>
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                PINNACLE AUTO
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Registered New Zealand motor vehicle trader and direct tyre importer.
              Supplying verified automotive parts and safety-tested restraints with guaranteed fitment.
            </p>
            <div className="text-xs text-slate-500 space-y-1 pt-1">
              <p><strong className="text-slate-700">Licence:</strong> MVD-89211 (M409121)</p>
              <p><strong className="text-slate-700">NZBN:</strong> 9429041234567</p>
              <p><strong className="text-slate-700">GST:</strong> 123-456-789</p>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Catalogues
            </h4>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-blue-700 transition-colors">
                  Storefront Home
                </Link>
              </li>
              <li>
                <Link href="/tyres" className="hover:text-blue-700 transition-colors">
                  Commercial &amp; Passenger Tyres
                </Link>
              </li>
              <li>
                <Link href="/seat-belts" className="hover:text-blue-700 transition-colors">
                  Tested Seat Belts (Serialized)
                </Link>
              </li>
              <li>
                <Link href="/fitment" className="hover:text-blue-700 transition-colors">
                  Vehicle Fitment Finder
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-blue-700 transition-colors">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-blue-700 text-blue-600 font-semibold transition-colors">
                  Staff Admin Portal &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Popular Dimensions */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Popular Dimensions
            </h4>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <Link
                  href="/tyres?sectionWidth=205&aspectRatio=55&rimDiameter=16"
                  className="hover:text-blue-700 transition-colors font-mono"
                >
                  205/55 R16 (Corolla / i30)
                </Link>
              </li>
              <li>
                <Link
                  href="/tyres?sectionWidth=265&aspectRatio=65&rimDiameter=17"
                  className="hover:text-blue-700 transition-colors font-mono"
                >
                  265/65 R17 (Hilux / Ranger)
                </Link>
              </li>
              <li>
                <Link
                  href="/tyres?sectionWidth=225&aspectRatio=45&rimDiameter=17"
                  className="hover:text-blue-700 transition-colors font-mono"
                >
                  225/45 R17 (Golf / Audi)
                </Link>
              </li>
              <li>
                <Link
                  href="/tyres?sectionWidth=195&aspectRatio=80&rimDiameter=15"
                  className="hover:text-blue-700 transition-colors font-mono"
                >
                  195/80 R15C (HiAce Cargo)
                </Link>
              </li>
              <li>
                <Link
                  href="/seat-belts?make=Toyota&model=RAV4"
                  className="hover:text-blue-700 transition-colors"
                >
                  Toyota RAV4 Restraints
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Trade Counter & Depot */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Penrose Auckland Depot
            </h4>
            <ul className="mt-4 space-y-2 text-xs text-slate-500">
              <li className="flex items-start gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>18 Industry Road, Penrose, Auckland 1061</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Mon–Fri: 7:30am – 5:00pm NZST</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Saturday: 8:00am – 1:00pm (Pickups)</span>
              </li>
              <li className="pt-2 flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-blue-600 shrink-0" />
                <a href="tel:0800746622" className="text-slate-800 font-bold hover:text-blue-700">
                  0800 PINNACLE (0800 746 622)
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span>trade@pinnacleparts.co.nz</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment & Compliance Bar */}
        <div className="mt-12 border-t border-slate-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700">Payment:</span>
            <span className="rounded bg-white border border-slate-200 px-2 py-0.5 font-medium text-slate-700">
              Visa
            </span>
            <span className="rounded bg-white border border-slate-200 px-2 py-0.5 font-medium text-slate-700">
              Mastercard
            </span>
            <span className="rounded bg-white border border-slate-200 px-2 py-0.5 font-medium text-slate-700">
              POLi Pay
            </span>
            <span className="rounded bg-white border border-slate-200 px-2 py-0.5 font-medium text-slate-700">
              Afterpay
            </span>
            <span className="rounded bg-white border border-slate-200 px-2 py-0.5 font-medium text-slate-700">
              Bank Deposit (GST Invoice)
            </span>
          </div>

          <div className="text-[11px] text-slate-400 text-center md:text-right">
            &copy; {new Date().getFullYear()} Pinnacle Auto Spares &amp; Tyres Ltd. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
