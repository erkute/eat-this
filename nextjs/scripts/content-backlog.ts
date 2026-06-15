/**
 * Read-only growth backlog for restaurant descriptions and galleries.
 *
 * Run from nextjs/:
 *   npm run content:backlog
 *   npm run content:backlog -- --limit 10
 *   npm run content:backlog -- --json
 *
 * Uses public Sanity reads only. It never calls Places/Anthropic and never
 * writes content. Gallery gaps are reported for visibility, but the report
 * deliberately emits no Places-backed follow-up commands. Must Eats are
 * deliberately out of scope while that editorial stream is parked.
 */
import { createClient } from '@sanity/client'
import {
  rankDescriptionBacklog,
  rankGalleryBacklog,
  type BacklogItem,
  type ContentRestaurant,
} from './lib/content-backlog'

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

const QUERY = `*[_type == "restaurant" && !(_id in path("drafts.**"))] | order(name asc) {
    "slug": slug.current,
    name,
    district,
    cuisineType,
    "isOpen": isOpen == true && isClosed != true,
    "featured": featured == true,
    "tierAnon": tierAnon == true,
    "tierSigned": tierSigned == true,
    "hasImage": defined(image.asset),
    "galleryCount": coalesce(count(gallery), 0),
    "hasGooglePlaceId": defined(googlePlaceId),
    "descriptionLength": coalesce(length(description), 0),
    "hasMenuUrl": defined(menuUrl),
    "hasExternalPresence": defined(website) || defined(instagramHandle),
    "hasShortDescription": defined(shortDescription),
    "hasTip": defined(tip),
    lastReviewed
  }`

function readPositiveInteger(args: string[], flag: string, fallback: number): number {
  const index = args.indexOf(flag)
  if (index < 0) return fallback
  const value = Number(args[index + 1])
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${flag} requires a positive integer, e.g. ${flag} 10`)
  }
  return value
}

function table(items: BacklogItem[], limit: number): string {
  if (!items.length) return '_Keine Kandidaten._'
  const lines = [
    '| # | Restaurant | Bezirk | Score | Warum |',
    '|---:|---|---|---:|---|',
  ]
  for (const [index, item] of items.slice(0, limit).entries()) {
    lines.push(
      `| ${index + 1} | \`${item.slug}\` · ${item.name} | ${item.district ?? '—'} | ${item.score} | ${item.reasons.join(', ') || 'solider Basis-Content'} |`,
    )
  }
  return lines.join('\n')
}

async function main() {
  const args = process.argv.slice(2)
  const json = args.includes('--json')
  const limit = readPositiveInteger(args, '--limit', 20)
  const restaurants = await client.fetch<ContentRestaurant[]>(QUERY)
  const descriptions = rankDescriptionBacklog(restaurants)
  const gallery = rankGalleryBacklog(restaurants)
  const open = restaurants.filter((r) => r.isOpen)
  const withGallery = open.filter((r) => r.galleryCount > 0)
  const galleryBlocked = open.filter((r) => r.galleryCount === 0 && !r.hasGooglePlaceId)

  const report = {
    summary: {
      restaurantsPublished: restaurants.length,
      restaurantsOpen: open.length,
      descriptionsThin: descriptions.length,
      restaurantsWithGallery: withGallery.length,
      galleryReady: gallery.length,
      galleryBlockedMissingPlaceId: galleryBlocked.length,
    },
    descriptions: descriptions.slice(0, limit),
    gallery: gallery.slice(0, limit),
  }

  if (json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(`# Content-Backlog\n`)
  console.log(`Read-only Sanity snapshot. Keine Places-/Anthropic-Aufrufe, keine Writes.\n`)
  console.log(`- Restaurants: ${report.summary.restaurantsPublished} veröffentlicht, ${report.summary.restaurantsOpen} offen`)
  console.log(`- Beschreibungen: ${report.summary.descriptionsThin} unter 350 Zeichen`)
  console.log(`- Galerien: ${report.summary.restaurantsWithGallery} vorhanden, ${report.summary.galleryReady} direkt backfill-fähig, ${report.summary.galleryBlockedMissingPlaceId} ohne Place-ID blockiert\n`)
  console.log(`## Beschreibungs-Queue (Top ${Math.min(limit, descriptions.length)})\n`)
  console.log(table(descriptions, limit))
  console.log(`\n## Galerie-Queue (Top ${Math.min(limit, gallery.length)})\n`)
  console.log(table(gallery, limit))
  console.log(`\n_Galerie-Backfills sind geparkt: keine weiteren Google-Places-Reads._`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
