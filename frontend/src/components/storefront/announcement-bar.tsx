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
            <span>Sydney Yard & Trade Counter: 42 Jedda Rd, Prestons NSW</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-400">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>Open Mon–Fri 7:30am–5:00pm</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline-flex items-center gap-1.5 text-emerald-400">
            <Truck className="h-3.5 w-3.5" />
            <span>{message || 'Orders before 2:00pm dispatch same day'}</span>
          </span>
          <a
            href="tel:0298224100"
            className="flex items-center gap-1.5 text-white hover:text-amber-400 transition-colors font-semibold"
          >
            <Phone className="h-3.5 w-3.5 text-amber-500" />
            <span>Parts Hotline: (02) 9822 4100</span>
          </a>
        </div>
      </div>
    </div>
  );
}
