/**
 * Backfills missing publishable restaurant map photos from Google Places.
 *
 * Only owner-uploaded Places photos are accepted: the photo attribution must
 * match the restaurant name via scripts/lib/photo-curation.ts:isOwnerPhoto.
 * Guest/community photos are skipped entirely.
 *
 * Run from nextjs/:
 *   npx tsx scripts/backfill-map-photos.ts --dry-run
 *   npx tsx scripts/backfill-map-photos.ts --write
 *   npx tsx scripts/backfill-map-photos.ts --slug aviv-030 --write
 *
 * Required env (nextjs/.env.local):
 *   SANITY_API_WRITE_TOKEN, GOOGLE_API_KEY
 * Existing galleries are preserved; newly fetched owner photos are appended.
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import { randomUUID } from 'node:crypto'
import { isOwnerPhoto } from './lib/photo-curation'
import { filterBySlugs } from './lib/content-backlog'

loadEnv({ path: '.env.local' })

if (!process.env.GOOGLE_API_KEY || !process.env.SANITY_API_WRITE_TOKEN) {
  console.error('Missing GOOGLE_API_KEY / SANITY_API_WRITE_TOKEN in .env.local')
  process.exit(1)
}

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!
const FIRST_PARTY_PHOTO_SLUGS = ['bar-basta']
const MAX_GALLERY = 3

interface Target {
  _id: string
  name: string
  slug: string
  googlePlaceId: string
  hasHeroPhoto: boolean
  galleryCount: number
}

interface PlacesPhoto {
  name: string
  authorAttributions?: { displayName?: string; uri?: string }[]
}

interface PlacePhotosResponse {
  photos?: PlacesPhoto[]
  googleMapsUri?: string
}

interface UploadedPhoto {
  _id: string
  credit: string
  creditUrl: string
}

function photoAttribution(photo: PlacesPhoto, place: Pick<PlacePhotosResponse, 'googleMapsUri'>) {
  const author = photo.authorAttributions?.[0]
  const displayName = author?.displayName?.trim()
  return {
    credit: displayName ? `Foto: ${displayName}` : 'Foto: Google Maps',
    creditUrl: author?.uri ?? place.googleMapsUri ?? '',
  }
}

async function fetchPlacePhotos(placeId: string): Promise<PlacePhotosResponse | null> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=de`, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'photos,googleMapsUri',
    },
  })
  if (!res.ok) {
    console.warn(`  place details ${res.status} — skipping`)
    return null
  }
  return res.json()
}

async function uploadPhoto(
  photo: PlacesPhoto,
  place: PlacePhotosResponse,
  slug: string,
  suffix: string,
): Promise<UploadedPhoto | null> {
  const { credit, creditUrl } = photoAttribution(photo, place)
  if (!credit || !creditUrl) return null

  try {
    const url = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1600&key=${GOOGLE_API_KEY}`
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) {
      console.warn(`  photo fetch ${res.status} — skipping ${suffix}`)
      return null
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const asset = await sanity.assets.upload('image', buffer, {
      filename: `${slug}-${suffix}.${ext}`,
      contentType,
    })
    return { _id: asset._id, credit, creditUrl }
  } catch (err) {
    console.warn(`  photo upload failed: ${(err as Error).message} — skipping ${suffix}`)
    return null
  }
}

async function main() {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const dryRun = args.includes('--dry-run') || !write
  const slugs = args.flatMap((arg, index) => arg === '--slug' ? [args[index + 1]] : [])
  if (slugs.some((slug) => !slug || slug.startsWith('--'))) {
    console.error('--slug requires an exact restaurant slug, e.g. --slug aviv-030')
    process.exit(1)
  }

  let targets = await sanity.fetch<Target[]>(
    `*[_type == "restaurant" && isOpen != false && defined(googlePlaceId) && !(_id in path("drafts.**"))
      && (
        !defined(image.asset)
        || !(
          (defined(image.credit) && defined(image.creditUrl))
          || defined(instagramHandle)
          || slug.current in $firstPartyPhotoSlugs
        )
      )]
      | order(name asc) {
        _id,
        name,
        "slug": slug.current,
        googlePlaceId,
        "hasHeroPhoto": defined(image.asset),
        "galleryCount": coalesce(count(gallery), 0)
      }`,
    { firstPartyPhotoSlugs: FIRST_PARTY_PHOTO_SLUGS },
  )
  targets = filterBySlugs(targets, slugs)

  console.log(`${targets.length} restaurants need publishable map photos${dryRun ? ' (dry-run)' : ''}`)
  let writtenHero = 0
  let writtenGallery = 0
  let skippedNoOwner = 0

  for (const [idx, target] of targets.entries()) {
    console.log(`\n[${idx + 1}] ${target.name} (${target.slug})`)
    const place = await fetchPlacePhotos(target.googlePlaceId)
    if (!place?.photos?.length) {
      console.log('  no Places photos')
      continue
    }

    const pickedPhotos = place.photos
      .filter((photo) => photo.name && isOwnerPhoto(photo.authorAttributions?.[0]?.displayName, target.name))
      .slice(0, 1 + MAX_GALLERY)
    if (!pickedPhotos.length) {
      skippedNoOwner++
      console.log(`  owner photos: 0 / ${place.photos.length} — skipped`)
      continue
    }

    console.log(`  owner photos: ${pickedPhotos.length} / ${place.photos.length}; taking first ${pickedPhotos.length}`)

    if (dryRun) continue

    const hero = await uploadPhoto(pickedPhotos[0], place, target.slug, 'hero')
    if (!hero) continue

    const galleryUploads: UploadedPhoto[] = []
    for (const galleryPhoto of pickedPhotos.slice(1)) {
      const uploaded = await uploadPhoto(
        galleryPhoto,
        place,
        target.slug,
        `gallery-${galleryUploads.length + 1}`,
      )
      if (uploaded) galleryUploads.push(uploaded)
    }

    const galleryItems = galleryUploads.map((photo) => ({
      _key: randomUUID(),
      _type: 'image' as const,
      asset: { _type: 'reference' as const, _ref: photo._id },
      alt: `${target.name} – Foto`,
      credit: photo.credit,
      creditUrl: photo.creditUrl,
    }))

    const patch = sanity
      .patch(target._id)
      .set({
        image: {
          _type: 'image',
          asset: { _type: 'reference', _ref: hero._id },
          credit: hero.credit,
          creditUrl: hero.creditUrl,
        },
      })

    if (galleryItems.length) {
      if (target.galleryCount > 0) patch.append('gallery', galleryItems)
      else patch.set({ gallery: galleryItems })
    }

    await patch.commit()

    writtenHero++
    writtenGallery += galleryUploads.length
    console.log(`  written: hero + ${galleryUploads.length} gallery photo${galleryUploads.length === 1 ? '' : 's'}`)
  }

  console.log(`\nDone: ${writtenHero} heroes written, ${writtenGallery} gallery photos written, ${skippedNoOwner} skipped without owner photos.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
