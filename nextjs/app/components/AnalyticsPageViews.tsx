'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { loadAnalytics, trackEvent } from '@/lib/analytics'

function PageViewInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  useEffect(() => {
    loadAnalytics()
    trackEvent('page_view', {
      page_location: window.location.href,
      page_path: query ? `${pathname}?${query}` : pathname,
      page_title: document.title,
    })
  }, [pathname, query])

  return null
}

export default function AnalyticsPageViews() {
  return (
    <Suspense fallback={null}>
      <PageViewInner />
    </Suspense>
  )
}
