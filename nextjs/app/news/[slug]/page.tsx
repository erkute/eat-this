import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PortableText } from '@portabletext/react'
import { getArticleBySlug, getAllArticleSlugs } from '@/lib/sanity.server'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import SiteNav from '@/app/components/SiteNav'
import styles from './NewsArticle.module.css'

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
  const content = de ? a.contentDe || a.content : a.content
  const categoryLabel = de ? a.categoryLabelDe || a.categoryLabel : a.categoryLabel

  // serializeJsonLd produces safe, escaped JSON from structured data — not user HTML
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <SiteNav />
      <main className={styles.page}>
        <article className={styles.article}>
          <header className={styles.header}>
            {categoryLabel && <p className={styles.category}>{categoryLabel}</p>}
            <h1 className={styles.title}>{title}</h1>
            {excerpt && <p className={styles.excerpt}>{excerpt}</p>}
            {a.date && (
              <time className={styles.date} dateTime={a.date}>
                {new Date(a.date).toLocaleDateString(de ? 'de-DE' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
          </header>

          {a.imageUrl && (
            <img
              src={a.imageUrl}
              alt={a.alt || title}
              className={styles.heroImage}
              fetchPriority="high"
            />
          )}

          {content && (
            <div className={styles.body}>
              <PortableText value={content} />
            </div>
          )}
        </article>
      </main>
    </>
  )
}
