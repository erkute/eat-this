import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { client } from '@/lib/sanity';
import { SANITY_REVALIDATE_SECONDS, SITE_URL } from '@/lib/constants';
import BadgeGenerator from './BadgeGenerator';

interface PageProps {
  params: Promise<{ locale: string }>;
}

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

// Utility page for partner restaurants — noindex,follow. It exists to hand out
// the embed snippet during backlink outreach, not to rank. The links it
// produces (restaurant site → our /restaurant/<slug>) are the SEO payload.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const de = locale === 'de';
  return {
    title: de ? 'Empfohlenes Restaurant-Badge' : 'Featured restaurant badge',
    description: de
      ? 'Hol dir das „Empfohlen von Eat This"-Badge für deine Restaurant-Website.'
      : 'Grab the "Featured on Eat This" badge for your restaurant website.',
    robots: 'noindex,follow',
  };
}

type RestaurantOption = { name: string; slug: string };

export default async function BadgePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const restaurants = await client.fetch<RestaurantOption[]>(
    `*[_type == "restaurant" && defined(slug.current) && !(_id in path("drafts.**"))]{ name, "slug": slug.current } | order(name asc)`,
    {},
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['badge-restaurants'] } }
  );

  return (
    <BadgeGenerator
      restaurants={restaurants}
      locale={locale === 'en' ? 'en' : 'de'}
      siteUrl={SITE_URL}
    />
  );
}
