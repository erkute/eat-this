import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { getAllBezirkeWithStats } from '@/lib/sanity.server'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import styles from './Bezirk.module.css'

interface PageProps {
  params: Promise<{ locale: string }>
}

export const revalidate = 3600

function localeUrl(locale: string, path: string): string {
  return locale === 'de' ? `${SITE_URL}${path}` : `${SITE_URL}/${locale}${path}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const de = locale === 'de'
  const title = de ? 'Restaurants nach Bezirk' : 'Restaurants by district'
  const description = de
    ? 'Kuratierte Restaurant-Empfehlungen für jeden Berliner Bezirk — Mitte, Kreuzberg, Prenzlauer Berg, Neukölln, Schöneberg und mehr.'
    : "Curated restaurant picks for every Berlin district — Mitte, Kreuzberg, Prenzlauer Berg, Neukölln, Schöneberg, and beyond."
  const canonical = localeUrl(locale, '/bezirk')
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        de: localeUrl('de', '/bezirk'),
        en: localeUrl('en', '/bezirk'),
        'x-default': localeUrl('de', '/bezirk'),
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      locale: de ? 'de_DE' : 'en_US',
    },
  }
}

export default async function BezirkIndexPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const de = locale === 'de'
  const bezirke = await getAllBezirkeWithStats()

  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Eat This Berlin', item: localeUrl(locale, '/') },
          { '@type': 'ListItem', position: 2, name: de ? 'Bezirke' : 'Districts', item: localeUrl(locale, '/bezirk') },
        ],
      },
      {
        '@type': 'ItemList',
        itemListElement: bezirke.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          url: localeUrl(locale, `/bezirk/${b.slug}`),
        })),
      },
    ],
  })

  return (
    <>
      <Script id="schema-bezirk-index" type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.kicker}>{de ? 'Bezirke' : 'Districts'}</div>
          <h1 className={styles.title}>
            {de ? 'Restaurants nach Bezirk' : 'Restaurants by district'}
          </h1>
          <p className={styles.description}>
            {de
              ? 'Wähle einen Bezirk, um die kuratierte Restaurant-Auswahl zu sehen.'
              : 'Pick a district to see the curated restaurant selection.'}
          </p>
        </header>

        <hr className={styles.divider} />

        <section className={styles.bezirkGrid}>
          {bezirke.map(b => (
            <Link key={b._id} href={`/bezirk/${b.slug}`} className={styles.bezirkCard}>
              <span className={styles.bezirkName}>{b.name}</span>
              <span className={styles.bezirkCount}>
                {b.restaurantCount} {b.restaurantCount === 1
                  ? (de ? 'Restaurant' : 'restaurant')
                  : (de ? 'Restaurants' : 'restaurants')}
              </span>
            </Link>
          ))}
        </section>
      </main>
    </>
  )
}
