import type { Metadata } from 'next'
import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getAllBezirkeWithStats } from '@/lib/sanity.server'
import { serializeJsonLd } from '@/lib/json-ld'
import { localeUrl } from '@/lib/locale-url'
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata'
import { SITE_URL } from '@/lib/constants'
import styles from './Bezirk.module.css'

interface PageProps {
  params: Promise<{ locale: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const de = locale === 'de'
  const title = de ? 'Restaurants nach Bezirk' : 'Restaurants by district'
  const description = de
    ? 'Kuratierte Restaurant-Empfehlungen für jeden Berliner Bezirk — Mitte, Kreuzberg, Prenzlauer Berg, Neukölln, Schöneberg und mehr.'
    : "Curated restaurant picks for every Berlin district — Mitte, Kreuzberg, Prenzlauer Berg, Neukölln, Schöneberg, and beyond."
  const alternates = buildHreflangAlternates('/bezirk', de ? 'de' : 'en')
  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      type: 'website',
      locale: toOgLocale(de ? 'de' : 'en'),
      images: [
        {
          url: `${SITE_URL}/pics/og-card.png?v=4`,
          width: 1200,
          height: 1200,
          alt: 'EAT THIS – We tell you what to eat',
        },
      ],
    },
  }
}

export default async function BezirkIndexPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const de = locale === 'de'
  // Empty districts (no open spots) are hidden — an empty grid page is a
  // dead end for users and thin content for Google. Same rule as the Hub chips.
  const bezirke = (await getAllBezirkeWithStats()).filter(b => (b.restaurantCount ?? 0) > 0)

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
      <script
        id="schema-bezirk-index"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className={styles.page}>
        <header className={`${styles.hero} ${styles.indexHero}`}>
          <h1 className={styles.h1}>
            {de ? 'Berlin nach Bezirk' : 'Berlin by district'}
          </h1>
          <p className={styles.sub}>
            {de
              ? 'Mitte ist nicht Neukölln, Charlottenburg nicht Wedding. Such dir den Bezirk aus - wir zeigen dir die Läden, für die wir wirklich nochmal hinfahren würden.'
              : "Mitte is not Neukölln, Charlottenburg is not Wedding. Pick a district - we'll show you the places we'd cross town for again."}
          </p>
        </header>

        <section className={styles.districtsBlock} aria-label={de ? 'Alle Bezirke' : 'All districts'}>
          <div className={styles.districtsIntro}>
            <h2>{de ? 'Alle Bezirke' : 'All districts'}</h2>
          </div>
          <div className={styles.bezirkGrid}>
            {bezirke.map(b => {
              const examples = b.exampleRestaurants?.slice(0, 3) ?? []

              return (
                <article key={b._id} className={styles.bezirkCard}>
                  <h3 className={styles.bezirkName}>
                    <Link href={`/bezirk/${b.slug}`} className={styles.bezirkLink}>
                      {b.name}
                    </Link>
                  </h3>
                  {examples.length > 0 && (
                    <div
                      className={styles.bezirkExamples}
                      aria-label={de ? `Beispiel-Restaurants in ${b.name}` : `Example restaurants in ${b.name}`}
                    >
                      {examples.map(restaurant => (
                        <Link
                          key={restaurant._id}
                          href={`/restaurant/${restaurant.slug}`}
                          className={styles.bezirkExample}
                        >
                          {restaurant.photo && (
                            <span className={styles.bezirkExamplePhoto}>
                              <Image
                                src={restaurant.photo}
                                alt=""
                                fill
                                sizes="(max-width: 719px) 76px, 72px"
                              />
                            </span>
                          )}
                          <span className={styles.bezirkExampleCopy}>
                            <span className={styles.bezirkExampleName}>{restaurant.name}</span>
                            {restaurant.cuisineType && (
                              <span className={styles.bezirkExampleCategory}>{restaurant.cuisineType}</span>
                            )}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link href={`/bezirk/${b.slug}`} className={styles.bezirkMore}>
                    {de ? 'Mehr' : 'More'}
                    <span aria-hidden="true">→</span>
                  </Link>
                </article>
              )
            })}
          </div>
        </section>

      </main>
    </>
  )
}
