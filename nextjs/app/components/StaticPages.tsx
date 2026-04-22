'use client'

import { useTranslation } from '@/lib/i18n'
import { PortableTextRenderer } from '@/lib/PortableTextRenderer'
import type { StaticPageDoc } from '@/lib/types'

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
    <div className="app-page static-page" data-page={doc.slug} id={id} data-static-ssr="1">
      <div className="static-page-inner">
        <h1 className="static-page-title" id={`${id}-title`}>{title}</h1>
        <div className="static-page-body" id={`${id}-body`}>
          <PortableTextRenderer blocks={body} />
        </div>
      </div>
    </div>
  )
}

export default function StaticPages({ pages }: { pages: StaticPageDoc[] }) {
  const bySlug = new Map(pages.map(p => [p.slug, p]))
  return (
    <>
      {SLUG_ORDER.map(slug => {
        const doc = bySlug.get(slug)
        if (!doc) return null
        return <StaticPage key={slug} doc={doc} />
      })}
    </>
  )
}
