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
    if (style === 'h2') out.push(<h2 key={key}>{renderChildren(raw.children)}</h2>)
    else if (style === 'h3') out.push(<h3 key={key}>{renderChildren(raw.children)}</h3>)
    else out.push(<p key={key}>{renderChildren(raw.children)}</p>)
  }

  flushList()
  return <>{out}</>
}
