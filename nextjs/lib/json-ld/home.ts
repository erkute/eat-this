import { serializeJsonLd } from './serialize'
import type { LandingFaqEntry } from '@/lib/landing/faqs'

// Builds the FAQPage JSON-LD for the hub home page — mirrors the FAQ entries
// the hub actually renders so Google can pick them up for rich snippets.
// Organization + WebSite live in the site-wide `schema-org` graph emitted by
// app/[locale]/layout.tsx; don't repeat them here (duplicate @ids).
export function buildHomeJsonLd(faqs: LandingFaqEntry[]): string | null {
  if (faqs.length === 0) return null
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  })
}
