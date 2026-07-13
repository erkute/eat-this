'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getAnalyticsPageLocation, loadAnalytics, trackEvent } from '@/lib/analytics'

function PageViewInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  useEffect(() => {
    loadAnalytics()
    const { pageLocation, pagePath } = getAnalyticsPageLocation(window.location.href)
    trackEvent('page_view', {
      page_location: pageLocation,
      page_path: pagePath,
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
