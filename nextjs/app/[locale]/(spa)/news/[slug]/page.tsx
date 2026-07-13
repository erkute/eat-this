import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { getArticleBySlug, getAllArticleSlugs, getAllNewsArticles } from '@/lib/sanity.server'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { localeUrl } from '@/lib/locale-url'
import { toOgLocale } from '@/lib/seo/metadata'
import { routing } from '@/i18n/routing'
import { getLocalizedNewsMetadata } from '@/lib/news-metadata'
import NewsArticleShell from '@/app/components/NewsArticleShell'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs()
  return routing.locales.flatMap(locale =>
    slugs.map(slug => ({ locale, slug })),
  )
}

export const revalidate = 3600

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const a = await getArticleBySlug(slug)
  if (!a) return {}

  const de = locale === 'de'
  const { title, description } = getLocalizedNewsMetadata(a, locale)
  const baseImage = a.seo?.ogImageUrl || a.imageUrl?.split('?')[0]
  const image = baseImage
    ? `${baseImage}?w=1200&h=630&fit=crop&auto=format`
    : `${SITE_URL}/pics/og-card.png?v=4`

  // News uses the inverse i18n convention (base = EN `title`/`content`, DE
  // override = `titleDe`/`contentDe`), so the DE-base `buildHreflangAlternates`
  // gate can't express it. Emit a language alternate ONLY for the locales that
  // actually have a real translation — otherwise a single-language article gets
  // an `en` (or `de`) URL that just re-renders the other language's body, the
  // exact duplicate-content trap `hasEnContent` prevents for restaurants.
  const hasDe = Boolean(a.titleDe?.trim() && a.contentDe && a.contentDe.length > 0)
  const hasEn = Boolean(a.title?.trim() && a.content && a.content.length > 0)
  const languages: Record<string, string> = {}
  if (hasDe) languages.de = localeUrl('de', `/news/${slug}`)
  if (hasEn) languages.en = localeUrl('en', `/news/${slug}`)
  languages['x-default'] = localeUrl(hasDe ? 'de' : 'en', `/news/${slug}`)
  // Canonical = the requested locale if it has its own content, else the locale
  // that does (so the untranslated fallback page points at the real version).
  const selfHasContent = de ? hasDe : hasEn
  const canonicalLocale: 'de' | 'en' = selfHasContent ? (de ? 'de' : 'en') : hasDe ? 'de' : 'en'
  const alternates = { canonical: localeUrl(canonicalLocale, `/news/${slug}`), languages }

  return {
    title,
    description,
    robots: a.seo?.noIndex ? 'noindex,nofollow' : 'index,follow',
    alternates,
    openGraph: {
      title: `${title} | Eat This Berlin`,
      description,
      url: alternates.canonical,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: 'article',
      publishedTime: a.date,
      locale: toOgLocale(de ? 'de' : 'en'),
    },
  }
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const [a, relatedArticles] = await Promise.all([
    getArticleBySlug(slug),
    getAllNewsArticles(),
  ])
  if (!a) notFound()

  const de = locale === 'de'
  const title = de ? a.titleDe || a.title : a.title
  const excerpt = de ? a.excerptDe || a.excerpt : a.excerpt

  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        headline: title,
        description: excerpt,
        image: a.imageUrl,
        datePublished: a.date,
        dateModified: a.date,
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
    ],
  })

  return (
    <>
      {/* JSON-LD: serializeJsonLd escapes </ sequences — safe inline */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <NewsArticleShell article={a} relatedArticles={relatedArticles} locale={locale} isActive />
    </>
  )
}
