import * as React from 'react';
import { Phone, Clock, Truck, MapPin } from 'lucide-react';

export interface AnnouncementBarProps {
  message?: string;
}

export function AnnouncementBar({ message }: AnnouncementBarProps) {
  return (
    <div className="border-b border-slate-800 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-300">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-amber-500" />
            <span>Auckland Hub & Trade Counter: 18 Industry Rd, Penrose</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-400">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>Open Mon–Fri 7:30am–5:00pm NZST</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline-flex items-center gap-1.5 text-emerald-400">
            <Truck className="h-3.5 w-3.5" />
            <span>{message || 'NZ Nationwide Freight | Orders before 2:00pm dispatch same day'}</span>
          </span>
          <a
            href="tel:0800746622"
            className="flex items-center gap-1.5 text-white hover:text-amber-400 transition-colors font-semibold"
          >
            <Phone className="h-3.5 w-3.5 text-amber-500" />
            <span>Parts Hotline: 0800 PINNACLE</span>
          </a>
        </div>
      </div>
    </div>
  );
}
