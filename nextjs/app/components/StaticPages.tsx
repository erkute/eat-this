'use client'

import { useTranslation } from '@/lib/i18n'
import { PortableTextRenderer } from '@/lib/PortableTextRenderer'
import type { StaticPageDoc } from '@/lib/types'
import SiteFooter from './SiteFooter'
import styles from './StaticPages.module.css'

const SLUG_ORDER = ['about', 'contact', 'press', 'impressum', 'datenschutz', 'agb'] as const

function pageId(slug: string) {
  return 'staticPage' + slug.charAt(0).toUpperCase() + slug.slice(1)
}

function StaticPage({ doc }: { doc: StaticPageDoc }) {
  const { lang } = useTranslation()
  const de = lang === 'de'
  const title = (de ? doc.titleDe : doc.title) || doc.title || doc.titleDe || ''
  const body = (de ? doc.bodyDe : doc.body) || doc.body || doc.bodyDe || []
  const id = pageId(doc.slug)

  return (
    <div className={styles.page} data-page={doc.slug} id={id}>
      <div className={styles.inner}>
        <h1 className={styles.title} id={`${id}-title`}>{title}</h1>
        <div className={styles.body} id={`${id}-body`}>
          <PortableTextRenderer blocks={body} />
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}

export default function StaticPages({ pages, activeSlug }: { pages: StaticPageDoc[]; activeSlug?: string }) {
  if (!activeSlug || !(SLUG_ORDER as readonly string[]).includes(activeSlug)) return null
  const doc = pages.find(p => p.slug === activeSlug)
  if (!doc) return null
  return <StaticPage doc={doc} />
}
