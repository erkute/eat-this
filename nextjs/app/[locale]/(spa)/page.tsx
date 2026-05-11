import type { Metadata } from 'next'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { serializeJsonLd } from '@/lib/json-ld'

import HeroSection from '@/app/components/HeroSection'
import HeroBulletsSlab from '@/app/components/hero/HeroBulletsSlab'
import SiteFooter from '@/app/components/SiteFooter'
import WaitlistModal from '@/app/components/WaitlistModal'

import TrustBar from '@/app/components/landing/sections/TrustBar'
import RestaurantTicker from '@/app/components/landing/sections/RestaurantTicker'
import MustEatsSection from '@/app/components/landing/sections/MustEatsSection'
import StatementSection from '@/app/components/landing/sections/StatementSection'
import AvatarDivider from '@/app/components/landing/sections/AvatarDivider'
import MapTeaser from '@/app/components/landing/MapTeaser'
import CategoriesGrid from '@/app/components/landing/sections/CategoriesGrid'
import RecentlyAddedSection from '@/app/components/landing/sections/RecentlyAddedSection'
import PacksSection from '@/app/components/landing/sections/PacksSection'
import ReviewsSection from '@/app/components/landing/sections/ReviewsSection'
import FaqSection from '@/app/components/landing/sections/FaqSection'
import ReasonsSection from '@/app/components/landing/sections/ReasonsSection'
import ComingSection from '@/app/components/landing/sections/ComingSection'
import Newsletter from '@/app/components/landing/Newsletter'
import FinalCtaSection from '@/app/components/landing/sections/FinalCtaSection'

import {
  getLandingPage,
  getRestaurantCount,
  getCategoryGrid,
  getRecentlyAdded,
  getRestaurantTicker,
} from '@/lib/sanity.server'
import { pickLocale, pickLocaleArray, type Locale } from '@/lib/landing-locale'
import { SITE_URL } from '@/lib/constants'
import { localeUrl } from '@/lib/locale-url'

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

  const [doc, restaurantCount, categories, recentlyAdded, tickerItems] = await Promise.all([
    getLandingPage(),
    getRestaurantCount(),
    getCategoryGrid(),
    getRecentlyAdded(12),
    getRestaurantTicker(24),
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

  const homeUrl = localeUrl(locale, '/')
  const searchTarget = `${homeUrl}?q={search_term_string}`

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

  const mustEatsCtaHref = doc.mustEats.ctaHref || '/onboarding'
  const recentlyAddedHref = locale === 'de' ? '/' : '/en'

  return (
    <>
      <Script id="schema-website" type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <div className="app-page active" data-page="start">
        <HeroSection
          headline={pickLocale(doc.hero, 'headline', locale)}
          body={pickLocale(doc.hero, 'body', locale)}
          locale={locale}
          restaurantCount={restaurantCount}
          categoryCount={categories.length}
        />
        <div className="start-scroll-content" style={{ paddingTop: 0 }}>
          <TrustBar
            restaurantCount={restaurantCount}
            categoryCount={categories.length}
            locale={locale}
          />
          <RestaurantTicker
            items={tickerItems}
            locale={locale}
            underClaim={<HeroBulletsSlab locale={locale} />}
          />
          <MapTeaser
            headline={pickLocale(doc.insideMap, 'headline', locale)}
            screenshotUrls={doc.insideMap.screenshotUrls}
            locale={locale}
            restaurantCount={restaurantCount}
          />
          <CategoriesGrid
            headline={pickLocale(doc.categories, 'headline', locale)}
            categories={categories}
            locale={locale}
          />
          <StatementSection
            headline={pickLocale(doc.howWeCurate, 'headline', locale)}
            body={pickLocale(doc.howWeCurate, 'body', locale)}
            kind="curate"
            locale={locale}
          />
          <AvatarDivider />
          <MustEatsSection
            headline={pickLocale(doc.mustEats, 'headline', locale)}
            body={pickLocale(doc.mustEats, 'body', locale)}
            ctaLabel={pickLocale(doc.mustEats, 'ctaLabel', locale)}
            ctaHref={mustEatsCtaHref}
            locale={locale}
          />
          <ReasonsSection locale={locale} restaurantCount={restaurantCount} />
          <RecentlyAddedSection
            headline={pickLocale(doc.recentlyAdded, 'headline', locale)}
            body={pickLocale(doc.recentlyAdded, 'body', locale)}
            sectionCtaLabel={pickLocale(doc.recentlyAdded, 'sectionCtaLabel', locale)}
            sectionCtaHref={recentlyAddedHref}
            cards={recentlyAdded}
            locale={locale}
          />
          <ReviewsSection locale={locale} />
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
          <FaqSection locale={locale} />
          <ComingSection locale={locale} />
          <Newsletter
            headline={pickLocale(doc.newsletter, 'headline', locale)}
            body={pickLocale(doc.newsletter, 'body', locale)}
            ctaLabel={pickLocale(doc.newsletter, 'ctaLabel', locale)}
          />
          <FinalCtaSection locale={locale} restaurantCount={restaurantCount} />
          <SiteFooter />
        </div>
        <WaitlistModal />
      </div>
    </>
  )
}
