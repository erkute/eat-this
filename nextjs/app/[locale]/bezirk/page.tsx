import type { Metadata } from 'next'
import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getAllBezirkeWithStats } from '@/lib/sanity.server'
import { serializeJsonLd } from '@/lib/json-ld'
import { localeUrl } from '@/lib/locale-url'
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata'
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
  const featured = bezirke.find(b => b.imageUrl) ?? bezirke[0]
  const featuredImage = featured?.imageUrl ?? '/pics/home-dishes/gazzo-aubergine.webp'
  const spotLabel = (count?: number) =>
    de
      ? `${count ?? 0} Spots`
      : `${count ?? 0} spots`
  const featuredDescription = featured
    ? (de ? featured.description : featured.descriptionEn ?? featured.description)
    : null

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
              ? 'Spring direkt in den Kiez, in dem du essen willst. Jede Bezirksseite sammelt unsere kuratierten Spots und führt dich zur passenden Map.'
              : 'Jump straight into the neighborhood you want to eat in. Each district page collects our curated spots and links you to the matching map.'}
          </p>
          <div className={styles.indexHeroCount}>
            {de ? `${bezirke.length} Bezirke mit kuratierten Spots` : `${bezirke.length} districts with curated spots`}
          </div>
        </header>

        {featured && (
          <section className={styles.featuredDistrict} aria-label={de ? 'Erster Bezirk' : 'Featured district'}>
            <div className={styles.featuredCopy}>
              <span className={styles.featuredLabel}>{de ? 'Direkt rein' : 'Start here'}</span>
              <h2 className={styles.featuredName}>{featured.name}</h2>
              <p className={styles.featuredText}>
                {featuredDescription || (de
                  ? `Unsere kuratierte Auswahl für ${featured.name}, sortiert für den schnellen Einstieg.`
                  : `Our curated selection for ${featured.name}, arranged for a quick start.`)}
              </p>
              <div className={styles.featuredActions}>
                <Link href={`/bezirk/${featured.slug}`} className={styles.featuredPrimary}>
                  {de ? `${featured.name} öffnen` : `Open ${featured.name}`}
                </Link>
                <Link href={`/map?bezirk=${featured.slug}`} className={styles.featuredSecondary} rel="nofollow">
                  {de ? 'Auf der Map' : 'On the map'}
                </Link>
              </div>
            </div>
            {featuredImage && (
              <Link href={`/bezirk/${featured.slug}`} className={styles.featuredMedia} aria-label={featured.name}>
                <Image
                  src={featuredImage}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 100vw, 460px"
                  priority
                />
              </Link>
            )}
          </section>
        )}

        <section className={styles.districtsBlock} aria-label={de ? 'Alle Bezirke' : 'All districts'}>
          <div className={styles.districtsIntro}>
            <h2>{de ? 'Alle Bezirke' : 'All districts'}</h2>
            <p>
              {de
                ? 'Kurz scannen, Bezirk wählen, Spots öffnen.'
                : 'Scan quickly, choose a district, open the spots.'}
            </p>
          </div>
          <div className={styles.bezirkGrid}>
            {bezirke.map(b => (
              <Link key={b._id} href={`/bezirk/${b.slug}`} className={styles.bezirkCard}>
                <span className={styles.bezirkName}>{b.name}</span>
                <span className={styles.bezirkMeta}>
                  {spotLabel(b.restaurantCount)}
                  <span className={styles.bezirkArrow} aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </>
  )
}
