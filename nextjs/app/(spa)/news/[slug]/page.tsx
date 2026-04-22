import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getArticleBySlug, getAllArticleSlugs } from '@/lib/sanity.server'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import SPAShell from '../../SPAShell'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs()
  return slugs.map(slug => ({ slug }))
}

export const revalidate = 3600

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { lang } = await searchParams
  const a = await getArticleBySlug(slug)
  if (!a) return {}

  const de = lang !== 'en'
  const title = a.seo?.metaTitle || (de ? a.titleDe || a.title : a.title)
  const description =
    a.seo?.metaDescription ||
    (de ? a.excerptDe || a.excerpt : a.excerpt) ||
    ''
  const baseImage = a.seo?.ogImageUrl || a.imageUrl?.split('?')[0]
  const image = baseImage
    ? `${baseImage}?w=1200&h=630&fit=crop&auto=format`
    : `${SITE_URL}/pics/og-image.jpg`

  return {
    title,
    description,
    robots: a.seo?.noIndex ? 'noindex,nofollow' : 'index,follow',
    alternates: {
      canonical: `${SITE_URL}/news/${slug}`,
      languages: {
        de: `${SITE_URL}/news/${slug}`,
        en: `${SITE_URL}/news/${slug}?lang=en`,
      },
    },
    openGraph: {
      title: `${title} | Eat This Berlin`,
      description,
      url: `${SITE_URL}/news/${slug}`,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: 'article',
      publishedTime: a.date,
      locale: de ? 'de_DE' : 'en_US',
    },
  }
}

export default async function NewsArticlePage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { lang } = await searchParams
  const a = await getArticleBySlug(slug)
  if (!a) notFound()

  const de = lang !== 'en'
  const title = de ? a.titleDe || a.title : a.title
  const excerpt = de ? a.excerptDe || a.excerpt : a.excerpt

  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
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
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/news/${slug}` },
    inLanguage: de ? 'de' : 'en',
  })

  // SPA shell — app.min.js reads /news/<slug> and loads the article automatically.
  // JSON-LD and metadata are SSR'd for SEO; visual rendering is handled by the SPA.
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <SPAShell />
    </>
  )
}
