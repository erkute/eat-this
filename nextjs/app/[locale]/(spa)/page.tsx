import type { Metadata } from 'next'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { serializeJsonLd } from '@/lib/json-ld'

import HeroSection from '@/app/components/HeroSection'
import SiteFooter from '@/app/components/SiteFooter'

import MustEatsSection from '@/app/components/landing/sections/MustEatsSection'
import PacksSection from '@/app/components/landing/sections/PacksSection'
import FaqSection from '@/app/components/landing/sections/FaqSection'
import FinalCtaSection from '@/app/components/landing/sections/FinalCtaSection'
import LandingFloatingBubble from '@/app/components/landing/LandingFloatingBubble'

import {
  getLandingPage,
  getRestaurantCount,
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

  const [doc, restaurantCount] = await Promise.all([
    getLandingPage(),
    getRestaurantCount(),
  ])

  if (!doc) {
    // landingPage is a long-lived singleton; null here means the Sanity
    // fetch failed (network / permissions). Show a neutral placeholder
    // rather than crashing — components below would null-deref on doc.*.
    return (
      <div className="app-page active" data-page="start">
        <p style={{ padding: 48, textAlign: 'center' }}>
          Landing content unavailable. Please refresh in a moment.
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

  return (
    <>
      <Script id="schema-website" type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <div className="app-page active" data-page="start">
        <HeroSection />
        <div className="start-scroll-content" style={{ paddingTop: 0 }}>
          <MustEatsSection
            headline={pickLocale(doc.mustEats, 'headline', locale)}
            body={pickLocale(doc.mustEats, 'body', locale)}
            ctaLabel={pickLocale(doc.mustEats, 'ctaLabel', locale)}
            ctaHref={doc.mustEats.ctaHref || '/onboarding'}
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
            locale={locale}
            restaurantCount={restaurantCount}
          />
          <FaqSection locale={locale} />
          <FinalCtaSection locale={locale} restaurantCount={restaurantCount} />
          <SiteFooter />
        </div>
        <LandingFloatingBubble locale={locale} />
      </div>
    </>
  )
}
