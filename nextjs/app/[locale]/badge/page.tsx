import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { client } from '@/lib/sanity'
import { SITE_URL } from '@/lib/constants'
import BadgeGenerator from './BadgeGenerator'

interface PageProps {
  params: Promise<{ locale: string }>
}

export const revalidate = 3600

// Utility page for partner restaurants — noindex,follow. It exists to hand out
// the embed snippet during backlink outreach, not to rank. The links it
// produces (restaurant site → our /restaurant/<slug>) are the SEO payload.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const de = locale === 'de'
  return {
    title: de ? 'Empfohlenes Restaurant-Badge' : 'Featured restaurant badge',
    description: de
      ? 'Hol dir das „Empfohlen von Eat This"-Badge für deine Restaurant-Website.'
      : 'Grab the "Featured on Eat This" badge for your restaurant website.',
    robots: 'noindex,follow',
  }
}

type RestaurantOption = { name: string; slug: string }

export default async function BadgePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const restaurants = await client.fetch<RestaurantOption[]>(
    `*[_type == "restaurant" && defined(slug.current) && !(_id in path("drafts.**"))]{ name, "slug": slug.current } | order(name asc)`,
    {},
    { next: { revalidate: 3600, tags: ['badge-restaurants'] } },
  )

  return (
    <BadgeGenerator
      restaurants={restaurants}
      locale={locale === 'en' ? 'en' : 'de'}
      siteUrl={SITE_URL}
    />
  )
}
