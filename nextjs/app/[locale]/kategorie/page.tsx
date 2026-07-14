import type { Metadata } from 'next'
import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getAllCategories } from '@/lib/sanity.server'
import { localizedCategoryBlurb, localizedCategoryName } from '@/lib/categories'
import { categoryArt } from '@/lib/categoryArt'
import { serializeJsonLd } from '@/lib/json-ld'
import { localeUrl } from '@/lib/locale-url'
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata'
import { SITE_URL } from '@/lib/constants'
import sharedStyles from '../bezirk/Bezirk.module.css'
import styles from './Kategorie.module.css'

const HERO_PACK_SLUGS = ['breakfast', 'pizza', 'drinks'] as const

interface PageProps {
  params: Promise<{ locale: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const de = locale === 'de'
  const title = de ? 'Restaurants nach Kategorie' : 'Restaurants by category'
  const description = de
    ? 'Berliner Restaurants nach Anlass — Frühstück, Lunch, Dinner, Café, Süßes und Pizza.'
    : 'Berlin restaurants by occasion — breakfast, lunch, dinner, coffee, sweets, and pizza.'
  const alternates = buildHreflangAlternates('/kategorie', de ? 'de' : 'en')
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

export default async function KategorieIndexPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const de = locale === 'de'
  const loc = de ? 'de' : 'en'
  const categories = await getAllCategories()

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
      <script
        id="schema-kategorie-index"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className={`${sharedStyles.page} ${styles.indexPage}`}>
        <header className={styles.indexHero}>
          <div className={styles.heroCopy}>
            <div className={styles.kicker}>{de ? 'Kategorien' : 'Categories'}</div>
            <h1 className={styles.heroTitle}>
              {de ? 'Wonach ist dir?' : 'What are you craving?'}
            </h1>
            <p className={styles.heroLead}>
              {de
                ? 'Wähle eine Richtung und entdecke unsere handverlesenen Berliner Spots.'
                : 'Pick a direction and discover our hand-picked Berlin spots.'}
            </p>
          </div>

          <div className={styles.heroPacks} aria-hidden="true">
            {HERO_PACK_SLUGS.map((slug, index) => {
              const art = categoryArt(slug)
              return art ? (
                <Image
                  key={slug}
                  src={art}
                  alt=""
                  width={420}
                  height={630}
                  priority
                  className={`${styles.heroPack} ${styles[`heroPack${index + 1}`]}`}
                />
              ) : null
            })}
          </div>
        </header>

        <section className={styles.catalog} aria-labelledby="category-catalog-title">
          <div className={styles.catalogHead}>
            <h2 id="category-catalog-title">{de ? 'Alle Kategorien' : 'All categories'}</h2>
            <p>
              {de
                ? 'Jede Kategorie bringt ihren eigenen Booster Pack mit — mit neuen Spots und passenden Must Eats für deine Map.'
                : 'Every category comes with its own Booster Pack — new spots and matching Must Eats for your map.'}
            </p>
          </div>

          <div className={styles.categoryGrid}>
            {categories.map(c => {
              const label = localizedCategoryName(c, loc)
              const blurb = localizedCategoryBlurb(c, loc)
              const art = categoryArt(c.slug)
              return (
                <Link
                  key={c.slug}
                  href={`/kategorie/${c.slug}`}
                  className={styles.categoryCard}
                  aria-label={de ? `${label} entdecken` : `Discover ${label}`}
                >
                  <span className={styles.artStage}>
                    {art ? (
                      <Image
                        src={art}
                        alt={`${label} Pack`}
                        width={420}
                        height={630}
                        sizes="(max-width: 639px) 68vw, (max-width: 959px) 34vw, 240px"
                        className={styles.packArt}
                      />
                    ) : (
                      <span className={styles.artFallback}>{label}</span>
                    )}
                  </span>
                  <span className={styles.cardCopy}>
                    <span className={styles.categoryName}>{label}</span>
                    {blurb && <span className={styles.categoryBlurb}>{blurb}</span>}
                    <span className={styles.categoryCta}>
                      {de ? 'Kategorie entdecken' : 'Discover category'}
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M4 10h11M10 5l5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      </main>
    </>
  )
}
