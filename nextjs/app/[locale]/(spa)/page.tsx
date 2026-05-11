import type { Metadata } from 'next'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { serializeJsonLd } from '@/lib/json-ld'

import HeroSection from '@/app/components/HeroSection'
import SiteFooter from '@/app/components/SiteFooter'
import WaitlistModal from '@/app/components/WaitlistModal'

import TrustBar from '@/app/components/landing/sections/TrustBar'
import MapPreviewSection from '@/app/components/landing/sections/MapPreviewSection'
import MustEatsSection from '@/app/components/landing/sections/MustEatsSection'
import StatementSection from '@/app/components/landing/sections/StatementSection'
import MapTeaser from '@/app/components/landing/MapTeaser'
import CategoriesGrid from '@/app/components/landing/sections/CategoriesGrid'
import RecentlyAddedSection from '@/app/components/landing/sections/RecentlyAddedSection'
import PacksSection from '@/app/components/landing/sections/PacksSection'
import Newsletter from '@/app/components/landing/Newsletter'
import FinalCtaSection from '@/app/components/landing/sections/FinalCtaSection'

import {
  getLandingPage,
  getRestaurantCount,
  getCategoryGrid,
  getRecentlyAdded,
} from '@/lib/sanity.server'
import { pickLocale, pickLocaleArray, interpolate, type Locale } from '@/lib/landing-locale'

const SITE_URL = 'https://www.eatthisdot.com'

function localeUrl(locale: string, path: string): string {
  return locale === 'de' ? `${SITE_URL}${path}` : `${SITE_URL}/${locale}${path}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    alternates: {
      canonical: localeUrl(locale, '/'),
      languages: {
        de: localeUrl('de', '/'),
        en: localeUrl('en', '/'),
        'x-default': localeUrl('de', '/'),
      },
    },
  }
}

export default async function SPAHomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale: Locale = rawLocale === 'en' ? 'en' : 'de'
  setRequestLocale(rawLocale)

  const [doc, restaurantCount, categories, recentlyAdded] = await Promise.all([
    getLandingPage(),
    getRestaurantCount(),
    getCategoryGrid(),
    getRecentlyAdded(8),
  ])

  if (!doc) {
    return (
      <div className="app-page active" data-page="start">
        <p style={{ padding: 48, textAlign: 'center' }}>
          Landing page content not yet seeded. Run the seed script in <code>studio/scripts/seed-landing-page.mjs</code>.
        </p>
      </div>
    )
  }

  const homeUrl = locale === 'de' ? `${SITE_URL}/` : `${SITE_URL}/${locale}`
  const searchTarget = locale === 'de'
    ? `${SITE_URL}/?q={search_term_string}`
    : `${SITE_URL}/${locale}?q={search_term_string}`

  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Eat This Berlin',
        url: homeUrl,
        inLanguage: locale === 'de' ? 'de' : 'en',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: searchTarget },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        name: 'Eat This Berlin',
        url: SITE_URL,
        logo: `${SITE_URL}/pics/logo.webp`,
      },
    ],
  })

  const trustText = interpolate(pickLocale(doc.trustBar, 'line', locale), { count: restaurantCount })

  const heroCtaHref = doc.hero.ctaHref || '/'
  const mapPreviewHref = locale === 'de' ? '/' : '/en'
  const mustEatsCtaHref = doc.mustEats.ctaHref || '/onboarding'
  const recentlyAddedHref = locale === 'de' ? '/' : '/en'
  const finalCtaHref = doc.finalCta.ctaHref || '/'

  return (
    <>
      <Script id="schema-website" type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <div className="app-page active" data-page="start">
        <HeroSection
          headline={pickLocale(doc.hero, 'headline', locale)}
          body={pickLocale(doc.hero, 'body', locale)}
          ctaLabel={pickLocale(doc.hero, 'ctaLabel', locale)}
          ctaHref={heroCtaHref}
          heroImageUrl={doc.hero.imageUrl}
        />
        <div className="start-scroll-content" style={{ paddingTop: 0 }}>
          <TrustBar text={trustText} />
          <MapPreviewSection
            headline={pickLocale(doc.mapPreview, 'headline', locale)}
            body={pickLocale(doc.mapPreview, 'body', locale)}
            screenshotUrl={doc.mapPreview.screenshotUrl}
            ctaLabel={locale === 'de' ? 'Zur Karte' : 'See the map'}
            ctaHref={mapPreviewHref}
          />
          <MustEatsSection
            headline={pickLocale(doc.mustEats, 'headline', locale)}
            body={pickLocale(doc.mustEats, 'body', locale)}
            ctaLabel={pickLocale(doc.mustEats, 'ctaLabel', locale)}
            ctaHref={mustEatsCtaHref}
          />
          <StatementSection
            headline={pickLocale(doc.howWeCurate, 'headline', locale)}
            body={pickLocale(doc.howWeCurate, 'body', locale)}
          />
          <MapTeaser
            headline={pickLocale(doc.insideMap, 'headline', locale)}
            bodyItems={pickLocaleArray(doc.insideMap, 'items', locale)}
            screenshotUrls={doc.insideMap.screenshotUrls}
          />
          <CategoriesGrid
            headline={pickLocale(doc.categories, 'headline', locale)}
            categories={categories}
            locale={locale}
          />
          <RecentlyAddedSection
            headline={pickLocale(doc.recentlyAdded, 'headline', locale)}
            body={pickLocale(doc.recentlyAdded, 'body', locale)}
            sectionCtaLabel={pickLocale(doc.recentlyAdded, 'sectionCtaLabel', locale)}
            sectionCtaHref={recentlyAddedHref}
            cards={recentlyAdded}
            locale={locale}
          />
          <PacksSection
            headline={pickLocale(doc.packs, 'headline', locale)}
            body={pickLocale(doc.packs, 'body', locale)}
            starter={{
              title: pickLocale(doc.packs.starter, 'title', locale),
              body: pickLocale(doc.packs.starter, 'body', locale),
              ctaLabel: pickLocale(doc.packs.starter, 'ctaLabel', locale),
            }}
            category={{
              title: pickLocale(doc.packs.category, 'title', locale),
              body: pickLocale(doc.packs.category, 'body', locale),
              bullets: pickLocaleArray(doc.packs.category, 'bullets', locale),
              ctaLabel: pickLocale(doc.packs.category, 'ctaLabel', locale),
            }}
            complete={{
              title: pickLocale(doc.packs.complete, 'title', locale),
              body: pickLocale(doc.packs.complete, 'body', locale),
              bullets: pickLocaleArray(doc.packs.complete, 'bullets', locale),
              ctaLabel: pickLocale(doc.packs.complete, 'ctaLabel', locale),
            }}
            starterHref="/onboarding"
            locale={locale}
          />
          <StatementSection
            headline={pickLocale(doc.whyEatThis, 'headline', locale)}
            body={pickLocale(doc.whyEatThis, 'body', locale)}
          />
          <Newsletter
            headline={pickLocale(doc.newsletter, 'headline', locale)}
            body={pickLocale(doc.newsletter, 'body', locale)}
            ctaLabel={pickLocale(doc.newsletter, 'ctaLabel', locale)}
          />
          <FinalCtaSection
            headline={pickLocale(doc.finalCta, 'headline', locale)}
            body={pickLocale(doc.finalCta, 'body', locale)}
            ctaLabel={pickLocale(doc.finalCta, 'ctaLabel', locale)}
            ctaHref={finalCtaHref}
          />
          <SiteFooter />
        </div>
        <WaitlistModal />
      </div>
    </>
  )
}
