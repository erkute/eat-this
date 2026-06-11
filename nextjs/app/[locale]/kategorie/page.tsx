import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { setRequestLocale } from 'next-intl/server'
import { getAllCategories } from '@/lib/sanity.server'
import { localizedCategoryName } from '@/lib/categories'
import { serializeJsonLd } from '@/lib/json-ld'
import { localeUrl } from '@/lib/locale-url'
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata'
import styles from '../bezirk/Bezirk.module.css'

const POSTER_MAP: Record<string, string> = {
  breakfast: '/pics/booster/booster_breakfast.webp',
  coffee: '/pics/booster/booster_coffee.webp',
  dinner: '/pics/booster/booster_dinner.webp',
  drinks: '/pics/booster/booster_drinks.webp',
  'fast-food': '/pics/booster/booster_fastfood.webp',
  'fine-dining': '/pics/booster/booster_finedining.webp',
  lunch: '/pics/booster/booster_lunch.webp',
  pizza: '/pics/booster/booster_pizza.webp',
  sweets: '/pics/booster/booster_sweets.webp',
}

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
    },
  }
}

export default async function KategorieIndexPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const de = locale === 'de'
  const kategorieUrl = (slug: string) =>
    locale === 'de' ? `/kategorie/${slug}` : `/${locale}/kategorie/${slug}`
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
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.kicker}>{de ? 'Kategorien' : 'Categories'}</div>
          <h1 className={styles.h1}>
            {de ? 'Restaurants nach Kategorie' : 'Restaurants by category'}
          </h1>
          <p className={styles.sub}>
            {de
              ? 'Wähle, wonach Dir gerade ist — von Frühstück bis Pizza.'
              : 'Pick by occasion — from breakfast to pizza.'}
          </p>
        </header>

        <section className={styles.posterGrid}>
          {categories.map(c => {
            const label = localizedCategoryName(c, loc)
            const poster = POSTER_MAP[c.slug]
            return (
              <Link key={c.slug} href={kategorieUrl(c.slug)} className={styles.posterCard}>
                {poster ? (
                  <div className={styles.posterFrame}>
                    <Image
                      src={poster}
                      alt={`${label} Pack`}
                      width={420}
                      height={560}
                      sizes="(max-width: 720px) 50vw, (max-width: 960px) 33vw, 280px"
                    />
                  </div>
                ) : (
                  <div className={`${styles.posterFrame} ${styles.posterFrameEmpty}`}>{label}</div>
                )}
                <span className={styles.posterName}>{label}</span>
              </Link>
            )
          })}
        </section>

      </main>
    </>
  )
}
