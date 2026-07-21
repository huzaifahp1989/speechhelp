'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

/** Logs a Firebase Analytics page_view on every client-side route change. */
export default function FirebaseAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams?.toString();
    void trackPageView(pathname || '/', search ? `?${search}` : undefined);
  }, [pathname, searchParams]);

  return null;
}
