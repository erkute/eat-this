// nextjs/lib/buddy/stream.ts
import type { BuddyStreamEvent } from './types'

export function encodeBuddyEvent(event: BuddyStreamEvent): string {
  return JSON.stringify(event) + '\n'
}

// Strips markdown links pointing at /<locale>/restaurant/<slug> whose slug is not
// in allowedSlugs, replacing them with their plain label. Safety net against a
// hallucinated spot link slipping into the streamed text.
const RESTAURANT_LINK = /\[([^\]]+)\]\(\/[a-z]{2}\/restaurant\/([^)]+)\)/g

export function sanitizeLinks(text: string, allowedSlugs: Set<string>): string {
  return text.replace(RESTAURANT_LINK, (match, label: string, slug: string) =>
    allowedSlugs.has(slug) ? match : label,
  )
}
