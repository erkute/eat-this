'use client'

// Segment error boundary for everything below [locale]/layout.tsx. Before
// this existed, any render/data error on a page (e.g. a Sanity CDN timeout
// on a dynamic route) escalated straight to the bare global-error screen.
// The [locale] layout stays mounted, so globals.css and the html/body shell
// are still there — we only render the inner card, mirroring not-found.
//
// Deliberately minimal dependencies: no providers, no nav, no i18n context.
// Those can be part of the failure; the boundary must not crash itself.
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import styles from '../not-found.module.css'

const COPY = {
  de: {
    headline: 'Kurz verschluckt.',
    sub: 'Da ist gerade etwas schiefgelaufen. Versuch es nochmal — oder geh zurück zur Map.',
    retry: 'Nochmal versuchen',
    home: 'Zur Startseite',
  },
  en: {
    headline: 'That went down the wrong pipe.',
    sub: 'Something just went wrong. Try again — or head back to the map.',
    retry: 'Try again',
    home: 'Back to home',
  },
} as const

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  // No i18n provider here by design — derive the locale from the URL.
  const pathname = usePathname() ?? '/'
  const locale = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'de'
  const copy = COPY[locale]

  return (
    <main className={styles.page} aria-labelledby="error-title">
      <section className={styles.hero}>
        <div className={styles.copy}>
          <div className={styles.codeBlock} aria-hidden="true">
            <span>500</span>
          </div>
          <h1 className={styles.title} id="error-title">
            {copy.headline}
          </h1>
          <p className={styles.sub}>{copy.sub}</p>
          <div className={styles.actions}>
            <button type="button" onClick={reset} className={`${styles.primaryCta} ${styles.ctaButton}`}>
              {copy.retry}
            </button>
            <a href={locale === 'en' ? '/en' : '/'} className={styles.secondaryCta}>
              {copy.home}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
