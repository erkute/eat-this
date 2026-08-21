'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { countView, getAnalyticsPageLocation, loadAnalytics, trackEvent } from '@/lib/analytics';

function PageViewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useEffect(() => {
    // Counted for everyone, before anything consent-dependent runs. This is the
    // only page-view signal that survives a "no thanks".
    countView();
    loadAnalytics();
    const { pageLocation, pagePath } = getAnalyticsPageLocation(window.location.href);
    trackEvent('page_view', {
      page_location: pageLocation,
      page_path: pagePath,
      page_title: document.title,
    });
  }, [pathname, query]);

  return null;
}

export default function AnalyticsPageViews() {
  return (
    <Suspense fallback={null}>
      <PageViewInner />
    </Suspense>
  );
}
