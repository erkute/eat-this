// nextjs/lib/buddy/stream.ts
import type { BuddyStreamEvent } from './types'

export function encodeBuddyEvent(event: BuddyStreamEvent): string {
  return JSON.stringify(event) + '\n'
}

// Strips markdown links pointing at /<locale>/restaurant/<slug> whose slug is not
// in allowedSlugs, replacing them with their plain label. Safety net against a
// hallucinated spot link slipping into the streamed text.
const RESTAURANT_LINK = /\[([^\]]+)\]\(\/(?:[a-z]{2}\/)?restaurant\/([^)]+)\)/g

export function sanitizeLinks(text: string, allowedSlugs: Set<string>): string {
  return text.replace(RESTAURANT_LINK, (match, label: string, slug: string) =>
    allowedSlugs.has(slug) ? match : label,
  )
}

// Remy ends a spot answer with `[[chips: a | b | c]]` — short tappable
// follow-ups. Pull them out (and strip the marker from the visible text). An
// incomplete marker mid-stream simply isn't matched yet, so nothing flashes.
const CHIPS_MARKER = /\[\[chips:([^\]]*)\]\]/

export function extractFollowups(content: string): { chips: string[]; rest: string } {
  const m = content.match(CHIPS_MARKER)
  if (!m || m.index === undefined) return { chips: [], rest: content }
  const chips = m[1]
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
  const rest = (content.slice(0, m.index) + content.slice(m.index + m[0].length)).trimEnd()
  return { chips, rest }
}

export type AnswerSegment =
  | { type: 'text'; text: string }
  | { type: 'spot'; slug: string }

const SPOT_MARKER = /\[\[spot:([a-z0-9-]+)\]\]/g

// Splits a (possibly mid-stream) answer into ordered text/spot segments at the
// `[[spot:<slug>]]` markers Remy emits. Unknown or duplicate slugs are dropped
// (their text is kept), and an incomplete trailing marker is hidden so it
// doesn't flash while streaming.
export function splitAnswerSegments(
  content: string,
  allowedSlugs: Set<string>,
): { segments: AnswerSegment[]; placedSlugs: string[] } {
  // Cut a dangling '[[' that has no closing ']]' after it (incomplete marker).
  let text = content
  const lastOpen = text.lastIndexOf('[[')
  const lastClose = text.lastIndexOf(']]')
  if (lastOpen > lastClose) text = text.slice(0, lastOpen)

  const segments: AnswerSegment[] = []
  const placed = new Set<string>()
  let buf = ''
  let lastIndex = 0
  const flush = () => {
    if (buf.trim().length > 0) segments.push({ type: 'text', text: buf })
    buf = ''
  }

  SPOT_MARKER.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = SPOT_MARKER.exec(text)) !== null) {
    buf += text.slice(lastIndex, m.index)
    lastIndex = m.index + m[0].length
    const slug = m[1]
    if (!allowedSlugs.has(slug) || placed.has(slug)) continue // drop marker, keep buffering text
    flush()
    placed.add(slug)
    segments.push({ type: 'spot', slug })
  }
  buf += text.slice(lastIndex)
  flush()

  return { segments, placedSlugs: [...placed] }
}
