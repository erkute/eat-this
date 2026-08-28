import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getArticleBySlug, getAllArticleSlugs, getAllNewsArticles } from '@/lib/sanity.server';
import { serializeJsonLd, buildArticleSpotsItemList } from '@/lib/json-ld';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import { localeUrl } from '@/lib/locale-url';
import { INDEXABLE_ROBOTS, toOgLocale } from '@/lib/seo/metadata';
import { routing } from '@/i18n/routing';
import { getLocalizedNewsMetadata } from '@/lib/news-metadata';
import { buildBrandedTitle } from '@/lib/seo/metadata-text';
import NewsArticleShell from '@/app/components/NewsArticleShell';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const a = await getArticleBySlug(slug);
  if (!a) return {};

  const de = locale === 'de';
  const { title, description } = getLocalizedNewsMetadata(a, locale);
  const brandedTitle = buildBrandedTitle(title);
  const baseImage = a.seo?.ogImageUrl || a.imageUrl?.split('?')[0];
  const image = baseImage
    ? `${baseImage}?w=1200&h=630&fit=crop&auto=format`
    : `${SITE_URL}/pics/og-card.png?v=${OG_CARD_VERSION}`;

  // News uses the inverse i18n convention (base = EN `title`/`content`, DE
  // override = `titleDe`/`contentDe`), so the DE-base `buildHreflangAlternates`
  // gate can't express it. Emit a language alternate ONLY for the locales that
  // actually have a real translation — otherwise a single-language article gets
  // an `en` (or `de`) URL that just re-renders the other language's body, the
  // exact duplicate-content trap `hasEnContent` prevents for restaurants.
  const hasDe = Boolean(a.titleDe?.trim() && a.contentDe && a.contentDe.length > 0);
  const hasEn = Boolean(a.title?.trim() && a.content && a.content.length > 0);
  const languages: Record<string, string> = {};
  if (hasDe) languages.de = localeUrl('de', `/news/${slug}`);
  if (hasEn) languages.en = localeUrl('en', `/news/${slug}`);
  languages['x-default'] = localeUrl(hasDe ? 'de' : 'en', `/news/${slug}`);
  // Canonical = the requested locale if it has its own content, else the locale
  // that does (so the untranslated fallback page points at the real version).
  const selfHasContent = de ? hasDe : hasEn;
  const canonicalLocale: 'de' | 'en' = selfHasContent ? (de ? 'de' : 'en') : hasDe ? 'de' : 'en';
  const alternates = { canonical: localeUrl(canonicalLocale, `/news/${slug}`), languages };

  return {
    title: { absolute: brandedTitle },
    description,
    robots: a.seo?.noIndex ? 'noindex,nofollow' : INDEXABLE_ROBOTS,
    alternates,
    openGraph: {
      title: brandedTitle,
      description,
      url: alternates.canonical,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: 'article',
      publishedTime: a.date,
      locale: toOgLocale(de ? 'de' : 'en'),
    },
    twitter: {
      card: 'summary_large_image',
      title: brandedTitle,
      description,
      images: [image],
    },
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [a, relatedArticles] = await Promise.all([getArticleBySlug(slug), getAllNewsArticles()]);
  if (!a) notFound();

  const de = locale === 'de';
  const title = de ? a.titleDe || a.title : a.title;
  const excerpt = de ? a.excerptDe || a.excerpt : a.excerpt;

  // Dieselbe Fassung, die NewsArticleShell rendert — sonst beschriebe die
  // ItemList eine Liste, die auf dieser Seite gar nicht steht.
  const renderedBlocks = (de ? a.contentDe : a.content) || a.content;
  const spotsItemList = buildArticleSpotsItemList({
    blocks: renderedBlocks,
    locale,
    name: title,
  });

  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        // `Article`, nicht `NewsArticle`: Unter /news liegen immergrüne Guides
        // („Die 10 besten Bäckereien in Berlin") und Kolumnen, keine Meldungen.
        // `NewsArticle` behauptet Aktualität — einen Anlass, ein Datum, das
        // etwas bedeutet — und macht dieselbe Zusage Richtung Top Stories und
        // Google News, für die diese Seite weder angemeldet ist noch eine
        // Erscheinungsfrequenz hat. `Article` beschreibt sie richtig; die
        // ItemList darunter trägt ohnehin die Substanz eines Listen-Guides.
        '@type': 'Article',
        headline: title,
        description: excerpt,
        image: a.imageUrl,
        datePublished: a.date,
        dateModified: a.updatedAt || a.date,
        author: { '@type': 'Organization', name: 'Eat This Berlin', url: SITE_URL },
        publisher: {
          '@type': 'Organization',
          name: 'Eat This Berlin',
          url: SITE_URL,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/pics/logo.webp` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': localeUrl(locale, `/news/${slug}`) },
        inLanguage: de ? 'de' : 'en',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Eat This Berlin',
            item: localeUrl(locale, '/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: de ? 'News' : 'News',
            item: localeUrl(locale, '/news'),
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: title,
            item: localeUrl(locale, `/news/${slug}`),
          },
        ],
      },
      // Guides sind Listen. Artikel ohne spotCards bekommen keine ItemList.
      ...(spotsItemList ? [spotsItemList] : []),
    ],
  });

  return (
    <>
      {/* JSON-LD: serializeJsonLd escapes </ sequences — safe inline */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <NewsArticleShell article={a} relatedArticles={relatedArticles} locale={locale} isActive />
    </>
  );
}
