'use client'

import { useTranslation } from '@/lib/i18n'
import { PortableTextRenderer } from '@/lib/PortableTextRenderer'
import type { StaticPageDoc } from '@/lib/types'
import SiteFooter from './SiteFooter'

const SLUG_ORDER = ['about', 'contact', 'press', 'impressum', 'datenschutz', 'agb'] as const

function pageId(slug: string) {
  return 'staticPage' + slug.charAt(0).toUpperCase() + slug.slice(1)
}

function StaticPage({ doc, isActive }: { doc: StaticPageDoc; isActive: boolean }) {
  const { lang } = useTranslation()
  const de = lang === 'de'
  const title = (de ? doc.titleDe : doc.title) || doc.title || doc.titleDe || ''
  const body = (de ? doc.bodyDe : doc.body) || doc.body || doc.bodyDe || []
  const id = pageId(doc.slug)

  return (
    <div className={`app-page static-page${isActive ? ' active' : ''}`} data-page={doc.slug} id={id} data-static-ssr="1">
      <div className="static-page-inner">
        <h1 className="static-page-title" id={`${id}-title`}>{title}</h1>
        <div className="static-page-body" id={`${id}-body`}>
          <PortableTextRenderer blocks={body} />
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}

export default function StaticPages({ pages, activeSlug }: { pages: StaticPageDoc[]; activeSlug?: string }) {
  // Render only the active static page — previously rendered all 6, which
  // gave /about /contact /press /impressum /datenschutz /agb near-identical
  // HTML bodies (same 6 page contents present, only .active class moved).
  // Google flagged that as duplicate content → none of them got indexed.
  if (!activeSlug || !(SLUG_ORDER as readonly string[]).includes(activeSlug)) return null
  const doc = pages.find(p => p.slug === activeSlug)
  if (!doc) return null
  return <StaticPage doc={doc} isActive />
}
