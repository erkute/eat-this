import { Fragment, type ReactNode } from 'react'
import type { PortableTextBlock, MustEatCardBlock, SpotCardBlock, ArticleSpot } from './types'

type Span = {
  _type?: string
  _key?: string
  text?: string
  marks?: string[]
}

type LinkDef = { _key: string; _type: 'link'; href?: string; blank?: boolean }
type MarkDef = LinkDef | { _key: string; _type: string }

type Block = PortableTextBlock & {
  style?: string
  listItem?: string
  children?: Span[]
  markDefs?: MarkDef[]
}

/** Internal deep-link to the (noindex) map view, e.g. `/map?r=sofi` or
 *  `/en/map?r=sofi`. Such links get rel="nofollow" so the indexable article
 *  doesn't bleed link equity into the map — same policy as the spot cards and
 *  Hub tiles (see feedback_seo_nofollow_into_noindex). */
function isMapLink(href: string): boolean {
  return /^\/(?:[a-z]{2}\/)?map(?:[/?#]|$)/.test(href)
}

function renderLink(def: LinkDef, node: ReactNode): ReactNode {
  const href = def.href
  if (!href) return node
  const internal = href.startsWith('/')
  const rel = [isMapLink(href) ? 'nofollow' : null, internal ? null : 'noopener noreferrer']
    .filter(Boolean)
    .join(' ')
  const target = !internal && def.blank ? '_blank' : undefined
  return (
    <a href={href} {...(rel ? { rel } : {})} {...(target ? { target } : {})}>
      {node}
    </a>
  )
}

function renderSpan(span: Span, key: number, markDefs: MarkDef[] = []): ReactNode {
  let node: ReactNode = span.text ?? ''
  for (const mark of span.marks ?? []) {
    if (mark === 'strong') node = <strong>{node}</strong>
    else if (mark === 'em') node = <em>{node}</em>
    else {
      // Annotation mark (key into markDefs) — currently only `link`.
      const def = markDefs.find((d) => d._key === mark)
      if (def && def._type === 'link') node = renderLink(def as LinkDef, node)
    }
  }
  return <span key={key}>{node}</span>
}

function renderChildren(children: Span[] = [], markDefs: MarkDef[] = []): ReactNode {
  return children.map((c, i) => renderSpan(c, i, markDefs))
}

/** Concatenated plain text of a block's spans — used for heading anchors. */
function headingText(children: Span[] = []): string {
  return children.map((c) => c.text ?? '').join('')
}

/** Deterministic ASCII anchor slug. Shared by the renderer (heading ids) and
 *  the article TOC so the #-links line up. */
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface ArticleHeading {
  id: string
  text: string
  level: 2 | 3
}

/** Walk article blocks and return the unique restaurants referenced by inline
 *  mustEatCard + spotCard blocks, in order of first appearance. Feeds the
 *  "Spots im Artikel" grid + spotrail. */
export function extractArticleSpots(blocks?: PortableTextBlock[]): ArticleSpot[] {
  if (!blocks?.length) return []
  const seen = new Set<string>()
  const out: ArticleSpot[] = []
  for (const raw of blocks as (MustEatCardBlock | SpotCardBlock)[]) {
    if (raw._type !== 'mustEatCard' && raw._type !== 'spotCard') continue
    if (!raw.restaurantName) continue
    const key = raw.restaurantSlug || raw.restaurantName
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      name: raw.restaurantName,
      slug: raw.restaurantSlug,
      district: raw.district,
      cuisineType: raw.cuisineType,
      photo: raw.restaurantPhoto,
    })
  }
  return out
}

/** Walk Portable Text blocks and return the h2/h3 headings for a table of
 *  contents. ids match the ones the renderer emits (same slugifyHeading). */
export function extractHeadings(blocks?: PortableTextBlock[]): ArticleHeading[] {
  if (!blocks?.length) return []
  const out: ArticleHeading[] = []
  for (const raw of blocks as Block[]) {
    if (raw._type !== 'block') continue
    if (raw.style !== 'h2' && raw.style !== 'h3') continue
    const text = headingText(raw.children).trim()
    const id = slugifyHeading(text)
    if (!text || !id) continue
    out.push({ id, text, level: raw.style === 'h2' ? 2 : 3 })
  }
  return out
}

// Mirrors the shape of the legacy renderPortableText helper in app.min.js:
// handles block-level style (h2/h3/blockquote/normal), listItem (number/bullet),
// and inline marks (strong/em + link). Inline `mustEatCard` / `spotCard` blocks
// are delegated to the optional `renderMustEatCard` / `renderSpotCard` render-
// props (so this stays presentation-agnostic); callers that don't pass them
// simply skip those blocks. Other unknown types skip.
export function PortableTextRenderer({
  blocks,
  renderMustEatCard,
  renderSpotCard,
}: {
  blocks?: PortableTextBlock[]
  renderMustEatCard?: (block: MustEatCardBlock) => ReactNode
  renderSpotCard?: (block: SpotCardBlock) => ReactNode
}) {
  if (!blocks?.length) return null

  const out: ReactNode[] = []
  let listTag: 'ol' | 'ul' | null = null
  let listItems: ReactNode[] = []

  const flushList = () => {
    if (!listTag) return
    const Tag = listTag
    out.push(<Tag key={`list-${out.length}`}>{listItems}</Tag>)
    listTag = null
    listItems = []
  }

  for (const raw of blocks as Block[]) {
    if (raw._type === 'mustEatCard') {
      flushList()
      const card = renderMustEatCard?.(raw as unknown as MustEatCardBlock)
      if (card) out.push(<Fragment key={raw._key ?? out.length}>{card}</Fragment>)
      continue
    }
    if (raw._type === 'spotCard') {
      flushList()
      const card = renderSpotCard?.(raw as unknown as SpotCardBlock)
      if (card) out.push(<Fragment key={raw._key ?? out.length}>{card}</Fragment>)
      continue
    }
    if (raw._type !== 'block') { flushList(); continue }

    if (raw.listItem) {
      const wantTag = raw.listItem === 'number' ? 'ol' : 'ul'
      if (listTag !== wantTag) { flushList(); listTag = wantTag }
      listItems.push(<li key={raw._key ?? listItems.length}>{renderChildren(raw.children, raw.markDefs)}</li>)
      continue
    }

    flushList()
    const style = raw.style ?? 'normal'
    const key = raw._key ?? out.length
    if (style === 'h2') out.push(<h2 key={key} id={slugifyHeading(headingText(raw.children))}>{renderChildren(raw.children, raw.markDefs)}</h2>)
    else if (style === 'h3') out.push(<h3 key={key} id={slugifyHeading(headingText(raw.children))}>{renderChildren(raw.children, raw.markDefs)}</h3>)
    else if (style === 'blockquote') out.push(<blockquote key={key}>{renderChildren(raw.children, raw.markDefs)}</blockquote>)
    else out.push(<p key={key}>{renderChildren(raw.children, raw.markDefs)}</p>)
  }

  flushList()
  return <>{out}</>
}
