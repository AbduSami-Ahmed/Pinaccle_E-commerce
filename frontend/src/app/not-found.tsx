import * as React from 'react';
import { NotFoundState } from '@/components/shared/not-found-state';

export default function GlobalNotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <NotFoundState
        title="Page Not Found"
        message="The page or parts inventory category you requested does not exist."
        backHref="/"
        backLabel="Return to Storefront"
      />
    </div>
  );
}
