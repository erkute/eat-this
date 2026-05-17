import type { Metadata } from 'next'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { serializeJsonLd } from '@/lib/json-ld'

import HeroSection from '@/app/components/HeroSection'
import SiteFooter from '@/app/components/SiteFooter'

import PacksSection from '@/app/components/landing/sections/PacksSection'
import FaqSection from '@/app/components/landing/sections/FaqSection'
import FinalCtaSection from '@/app/components/landing/sections/FinalCtaSection'

import { getRestaurantCount } from '@/lib/sanity.server'
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

  const restaurantCount = await getRestaurantCount()

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
          <PacksSection locale={locale} restaurantCount={restaurantCount} />
          <FaqSection locale={locale} />
          <FinalCtaSection />
          <SiteFooter />
        </div>
      </div>
    </>
  )
}
