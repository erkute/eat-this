import type { Metadata } from 'next'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { serializeJsonLd } from '@/lib/json-ld'

import HeroSection from '@/app/components/HeroSection'
import SiteFooter from '@/app/components/SiteFooter'

import FeaturedSpotsSection from '@/app/components/landing/sections/FeaturedSpotsSection'
import PacksSection from '@/app/components/landing/sections/PacksSection'
import VoicesSection from '@/app/components/landing/sections/VoicesSection'
import CitiesSection from '@/app/components/landing/sections/CitiesSection'
import FaqSection from '@/app/components/landing/sections/FaqSection'
import FinalCtaSection from '@/app/components/landing/sections/FinalCtaSection'

import {
  getRestaurantCount,
  getFeaturedSpots,
} from '@/lib/sanity.server'
import { getLandingFaqs } from '@/lib/landing/faqs'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'
import { SITE_URL } from '@/lib/constants'
import { localeUrl } from '@/lib/locale-url'

type Locale = 'de' | 'en'

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

  const [restaurantCount, spots] = await Promise.all([
    getRestaurantCount(),
    getFeaturedSpots(12),
  ])
  const faqs = getLandingFaqs(locale)

  const homeUrl = localeUrl(locale, '/')
  const searchTarget = `${homeUrl}?q={search_term_string}`
  const restaurantUrl = (rSlug: string) =>
    locale === 'de' ? `/restaurant/${rSlug}` : `/${locale}/restaurant/${rSlug}`

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
      {
        '@type': 'ItemList',
        name: locale === 'de'
          ? 'Hand-picked Berliner Restaurants'
          : 'Hand-picked Berlin restaurants',
        numberOfItems: spots.length,
        itemListElement: spots.map((s, i) => {
          const priceLabel = formatPriceLabel(s)
          return {
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Restaurant',
              name: s.name,
              url: `${SITE_URL}${restaurantUrl(s.slug)}`,
              ...(s.cuisineType && { servesCuisine: s.cuisineType }),
              ...(priceLabel && { priceRange: priceLabel }),
              ...(s.photo && { image: s.photo }),
            },
          }
        }),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  })

  return (
    <>
      <Script id="schema-website" type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <div className="app-page active" data-page="start">
        <HeroSection />
        <div className="start-scroll-content" style={{ paddingTop: 0 }}>
          <FeaturedSpotsSection spots={spots} locale={locale} />
          <VoicesSection locale={locale} />
          <PacksSection locale={locale} restaurantCount={restaurantCount} />
          <FaqSection locale={locale} />
          <CitiesSection locale={locale} />
          <FinalCtaSection />
          <SiteFooter />
        </div>
      </div>
    </>
  )
}
