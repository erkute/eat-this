import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import { INDEXABLE_ROBOTS, buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { getStaticPage } from '@/lib/sanity.server';

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>;
}

// Whitelist of slugs this catch-all renders. Anything else 404s instead of
// silently dropping the user on the home view. /profile is dispatched by the
// dedicated /[locale]/profile/page.tsx route — it never reaches this catch-all.
const VALID_SLUGS = new Set(['about', 'contact', 'impressum', 'datenschutz', 'agb']);

function exactTopSlug(slug: string[]): string | undefined {
  return slug.length === 1 ? slug[0] : undefined;
}

type SlugMeta = {
  de: { title: string; description: string };
  en: { title: string; description: string };
  noIndex?: boolean;
};

const PAGE_META: Record<string, SlugMeta> = {
  about: {
    de: {
      title: 'Über mich',
      description:
        'Was Eat This ist, wer dahinter steckt und warum wir Berlins Restaurants kuratieren – plus Remy, der jeden Spot auf der Map kennt.',
    },
    en: {
      title: 'About me',
      description:
        "What Eat This is, who's behind it, why we curate Berlin's restaurants – plus Remy, who knows every spot on the map.",
    },
  },
  contact: {
    de: {
      title: 'Kontakt',
      description: 'Kontaktiere das Eat-This-Team für Anfragen, Kooperationen oder Feedback.',
    },
    en: {
      title: 'Contact',
      description: 'Get in touch with the Eat This team for inquiries, partnerships or feedback.',
    },
    noIndex: true,
  },
  impressum: {
    de: { title: 'Impressum', description: 'Impressum und rechtliche Angaben zu Eat This Berlin.' },
    en: { title: 'Imprint', description: 'Imprint and legal information for Eat This Berlin.' },
    noIndex: true,
  },
  datenschutz: {
    de: { title: 'Datenschutz', description: 'Datenschutzerklärung von Eat This Berlin.' },
    en: { title: 'Privacy', description: 'Privacy policy for Eat This Berlin.' },
    noIndex: true,
  },
  agb: {
    de: { title: 'AGB', description: 'Allgemeine Geschäftsbedingungen von Eat This Berlin.' },
    en: { title: 'Terms', description: 'Terms and conditions for Eat This Berlin.' },
    noIndex: true,
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const top = exactTopSlug(slug);
  if (!top || !PAGE_META[top]) {
    return {
      title: '404 — Eat This',
      robots: { index: false, follow: false },
    };
  }

  const meta = PAGE_META[top];
  const copy = locale === 'en' ? meta.en : meta.de;
  const path = `/${top}`;
  const alternates = buildHreflangAlternates(path, locale === 'en' ? 'en' : 'de');

  return {
    title: copy.title,
    description: copy.description,
    robots: meta.noIndex ? 'noindex,follow' : INDEXABLE_ROBOTS,
    alternates,
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: alternates.canonical,
      type: 'website',
      images: [
        {
          url: `${SITE_URL}/pics/og-card.png?v=${OG_CARD_VERSION}`,
          width: 1200,
          height: 630,
          alt: 'EAT THIS – We tell you what to eat',
        },
      ],
      locale: toOgLocale(locale === 'en' ? 'en' : 'de'),
    },
  };
}

export async function generateViewport({ params }: PageProps): Promise<Viewport> {
  await params;
  return {
    themeColor: '#15120e',
  };
}

// Catch-all for the static pages in VALID_SLUGS. Each top-slug
// renders only its own section. More-specific routes (/map, /news/[slug], …)
// take priority via Next.js routing precedence.
export default async function SPACatchAllPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const top = exactTopSlug(slug);
  if (!top || !VALID_SLUGS.has(top)) notFound();

  const activeLocale = locale === 'en' ? 'en' : 'de';
  const [{ default: StaticPages }, page] = await Promise.all([
    import('@/app/components/StaticPages'),
    getStaticPage(top, activeLocale),
  ]);
  if (!page) notFound();
  return <StaticPages doc={page} locale={activeLocale} />;
}
