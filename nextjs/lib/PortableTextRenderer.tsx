import type { ReactNode } from 'react'
import type { PortableTextBlock } from './types'

type Span = {
  _type?: string
  _key?: string
  text?: string
  marks?: string[]
}

type Block = PortableTextBlock & {
  style?: string
  listItem?: string
  children?: Span[]
}

function renderSpan(span: Span, key: number): ReactNode {
  let node: ReactNode = span.text ?? ''
  for (const mark of span.marks ?? []) {
    if (mark === 'strong') node = <strong>{node}</strong>
    else if (mark === 'em') node = <em>{node}</em>
  }
  return <span key={key}>{node}</span>
}

function renderChildren(children: Span[] = []): ReactNode {
  return children.map((c, i) => renderSpan(c, i))
}

/** Concatenated plain text of a block's spans — used for heading anchors. */
export function headingText(children: Span[] = []): string {
  return children.map((c) => c.text ?? '').join('')
}

/** Deterministic ASCII anchor slug. Shared by the renderer (heading ids) and
 *  the article TOC so the #-links line up. */
export function slugifyHeading(text: string): string {
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
// handles block-level style (h2/h3/normal), listItem (number/bullet),
// and inline marks (strong/em). Unknown types are skipped.
export function PortableTextRenderer({ blocks }: { blocks?: PortableTextBlock[] }) {
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
    if (raw._type !== 'block') { flushList(); continue }

    if (raw.listItem) {
      const wantTag = raw.listItem === 'number' ? 'ol' : 'ul'
      if (listTag !== wantTag) { flushList(); listTag = wantTag }
      listItems.push(<li key={raw._key ?? listItems.length}>{renderChildren(raw.children)}</li>)
      continue
    }

    flushList()
    const style = raw.style ?? 'normal'
    const key = raw._key ?? out.length
    if (style === 'h2') out.push(<h2 key={key} id={slugifyHeading(headingText(raw.children))}>{renderChildren(raw.children)}</h2>)
    else if (style === 'h3') out.push(<h3 key={key} id={slugifyHeading(headingText(raw.children))}>{renderChildren(raw.children)}</h3>)
    else out.push(<p key={key}>{renderChildren(raw.children)}</p>)
  }

  flushList()
  return <>{out}</>
}
