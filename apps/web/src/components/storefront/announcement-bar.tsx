import * as React from 'react';

export interface AnnouncementBarProps {
  message?: string;
}

export function AnnouncementBar({
  message = 'Free standard shipping on orders over $200 · Commercial tyre fitment verified',
}: AnnouncementBarProps) {
  if (!message || message.trim() === '') {
    return null;
  }

  return (
    <div className="border-b border-slate-800 bg-slate-900 px-4 py-2 text-center text-xs font-medium text-slate-200">
      <div className="mx-auto max-w-7xl">
        <span>{message}</span>
      </div>
    </div>
  );
}
