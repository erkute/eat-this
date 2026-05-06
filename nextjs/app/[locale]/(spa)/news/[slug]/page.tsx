import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { getArticleBySlug, getAllArticleSlugs, getAllNewsArticles } from '@/lib/sanity.server'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { routing } from '@/i18n/routing'
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

function localeUrl(locale: string, path: string): string {
  return locale === 'de' ? `${SITE_URL}${path}` : `${SITE_URL}/${locale}${path}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const a = await getArticleBySlug(slug)
  if (!a) return {}

  const de = locale === 'de'
  const title = a.seo?.metaTitle || (de ? a.titleDe || a.title : a.title)
  const description =
    a.seo?.metaDescription ||
    (de ? a.excerptDe || a.excerpt : a.excerpt) ||
    ''
  const baseImage = a.seo?.ogImageUrl || a.imageUrl?.split('?')[0]
  const image = baseImage
    ? `${baseImage}?w=1200&h=630&fit=crop&auto=format`
    : `${SITE_URL}/pics/og-image.jpg`

  const canonical = localeUrl(locale, `/news/${slug}`)

  return {
    title,
    description,
    robots: a.seo?.noIndex ? 'noindex,nofollow' : 'index,follow',
    alternates: {
      canonical,
      languages: {
        de: localeUrl('de', `/news/${slug}`),
        en: localeUrl('en', `/news/${slug}`),
        'x-default': localeUrl('de', `/news/${slug}`),
      },
    },
    openGraph: {
      title: `${title} | Eat This Berlin`,
      description,
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: 'article',
      publishedTime: a.date,
      locale: de ? 'de_DE' : 'en_US',
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
