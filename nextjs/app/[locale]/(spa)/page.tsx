import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import SPAShell from './SPAShell'

const SITE_URL = 'https://www.eatthisdot.com'

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL + '/',
    languages: {
      de: SITE_URL + '/',
      en: SITE_URL + '/en',
      'x-default': SITE_URL + '/',
    },
  },
}

export default async function SPAHomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return <SPAShell />
}
