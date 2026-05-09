'use client'

// Catches errors that escape the React tree (including root layout errors)
// and forwards them to Sentry. Required for Sentry to see crashes that
// happen above [locale]/layout.tsx — without this, those silently bypass
// any per-route error boundary.
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <h2>Etwas ist schiefgelaufen.</h2>
      </body>
    </html>
  )
}
