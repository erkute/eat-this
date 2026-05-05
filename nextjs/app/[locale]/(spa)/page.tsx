import type { Metadata } from 'next'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { serializeJsonLd } from '@/lib/json-ld'
import SPAShell from './SPAShell'

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
  const { locale } = await params
  setRequestLocale(locale)

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

  return (
    <>
      <Script id="schema-website" type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <SPAShell />
    </>
  )
}
