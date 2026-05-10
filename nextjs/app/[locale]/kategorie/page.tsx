import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { getAllCategories, getCategoryCounts } from '@/lib/sanity.server'
import { localizedCategoryName } from '@/lib/categories'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import styles from '../bezirk/Bezirk.module.css'

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
  const title = de ? 'Restaurants nach Kategorie' : 'Restaurants by category'
  const description = de
    ? 'Berliner Restaurants nach Anlass — Frühstück, Lunch, Dinner, Café, Süßes und Pizza.'
    : 'Berlin restaurants by occasion — breakfast, lunch, dinner, coffee, sweets, and pizza.'
  const canonical = localeUrl(locale, '/kategorie')
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        de: localeUrl('de', '/kategorie'),
        en: localeUrl('en', '/kategorie'),
        'x-default': localeUrl('de', '/kategorie'),
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

export default async function KategorieIndexPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const de = locale === 'de'
  const loc = de ? 'de' : 'en'
  const [categories, counts] = await Promise.all([
    getAllCategories(),
    getCategoryCounts(),
  ])

  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Eat This Berlin', item: localeUrl(locale, '/') },
          { '@type': 'ListItem', position: 2, name: de ? 'Kategorien' : 'Categories', item: localeUrl(locale, '/kategorie') },
        ],
      },
      {
        '@type': 'ItemList',
        itemListElement: categories.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: localizedCategoryName(c, loc),
          url: localeUrl(locale, `/kategorie/${c.slug}`),
        })),
      },
    ],
  })

  return (
    <>
      <Script id="schema-kategorie-index" type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.kicker}>{de ? 'Kategorien' : 'Categories'}</div>
          <h1 className={styles.title}>
            {de ? 'Restaurants nach Kategorie' : 'Restaurants by category'}
          </h1>
          <p className={styles.description}>
            {de
              ? 'Wähle, wonach Dir gerade ist — von Frühstück bis Pizza.'
              : 'Pick by occasion — from breakfast to pizza.'}
          </p>
        </header>

        <section className={styles.bezirkGrid}>
          {categories.map(c => {
            const count = counts[c.slug] ?? 0
            const label = localizedCategoryName(c, loc)
            return (
              <Link key={c.slug} href={`/kategorie/${c.slug}`} className={styles.bezirkCard}>
                <span className={styles.bezirkName}>{label}</span>
                <span className={styles.bezirkCount}>
                  {count} {count === 1
                    ? (de ? 'Restaurant' : 'restaurant')
                    : (de ? 'Restaurants' : 'restaurants')}
                </span>
              </Link>
            )
          })}
        </section>
      </main>
    </>
  )
}
