/**
 * Backfills the `gallery` field for existing restaurants from Google Places
 * photos — only the restaurant's own uploads (isOwnerPhoto in
 * scripts/lib/photo-curation), at most three.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/backfill-gallery.ts --dry-run            # count Google candidates only, no uploads, no writes
 *   npx tsx scripts/backfill-gallery.ts --limit 5            # first 5 restaurants only
 *   npx tsx scripts/backfill-gallery.ts --slug cafe-a --slug cafe-b
 *   npx tsx scripts/backfill-gallery.ts                      # full run (fills gaps only)
 *   npx tsx scripts/backfill-gallery.ts --force             # re-import ALL, overwriting existing galleries
 *
 * Without --force, restaurants with a non-empty gallery are skipped. Costs per
 * restaurant: 1 Place-Details call + up to 3 full-size photo calls
 * (~7 USD / 1000 photo calls).
 *
 * Required env (nextjs/.env.local):
 *   SANITY_API_WRITE_TOKEN, GOOGLE_API_KEY
 *
 * katalog-ausnahme: Bestandspflege, nicht Empfehlung. Die Galerie hängt an der
 * Detailseite, die ein geschlossener Spot behält (noindex,follow) — und ein Lauf
 * wird ohnehin über --slug/--limit gesteuert, nicht über den Katalogschnitt.
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@sanity/client';
import { randomUUID } from 'node:crypto';
import { importGalleryPhotos } from './import-from-url';
import { filterBySlugs } from './lib/content-backlog';

loadEnv({ path: '.env.local' });

// Pure CLI (never imported by the Next.js build), so unlike import-from-url
// we can fail fast on missing env before any client is constructed.
if (!process.env.GOOGLE_API_KEY || !process.env.SANITY_API_WRITE_TOKEN) {
  console.error('Missing GOOGLE_API_KEY / SANITY_API_WRITE_TOKEN in .env.local');
  process.exit(1);
}

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;

interface Target {
  _id: string;
  name: string;
  slug: string;
  googlePlaceId: string;
}

interface PlacePhotosResponse {
  photos?: {
    name: string;
    authorAttributions?: { displayName?: string; uri?: string }[];
  }[];
  googleMapsUri?: string;
}

async function fetchPlacePhotos(placeId: string): Promise<PlacePhotosResponse | null> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=de`, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'photos,googleMapsUri',
    },
  });
  if (!res.ok) {
    console.warn(`  place details ${res.status} — skipping`);
    return null;
  }
  return res.json();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  // --force re-curates restaurants that ALREADY have a gallery, overwriting it
  // (used when the curation rules change). Without it the run only fills gaps.
  const force = args.includes('--force');
  const limitArg = args.indexOf('--limit');
  const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;
  if (limitArg >= 0 && (Number.isNaN(limit) || limit < 1)) {
    console.error('--limit requires a positive integer, e.g. --limit 5');
    process.exit(1);
  }
  // --from "<name>" resumes from the first restaurant whose name sorts >= it
  // (targets are name-ordered), so an aborted run can continue without paying
  // to re-curate the part that already succeeded.
  const fromArg = args.indexOf('--from');
  const from = fromArg >= 0 ? args[fromArg + 1] : null;
  const slugs = args.flatMap((arg, index) => (arg === '--slug' ? [args[index + 1]] : []));
  if (slugs.some((slug) => !slug || slug.startsWith('--'))) {
    console.error('--slug requires an exact restaurant slug, e.g. --slug cafe-a');
    process.exit(1);
  }

  const galleryFilter = force ? '' : '&& (!defined(gallery) || count(gallery) == 0)';
  let targets = await sanity.fetch<Target[]>(
    `*[_type == "restaurant" && defined(googlePlaceId) && !(_id in path("drafts.**"))
       ${galleryFilter}]
       | order(name asc) { _id, name, "slug": slug.current, googlePlaceId }`
  );
  if (from) targets = targets.filter((t) => t.name.localeCompare(from) >= 0);
  targets = filterBySlugs(targets, slugs);
  console.log(
    `${targets.length} restaurants ${force ? 'to re-curate' : 'without gallery'}${from ? ` (from "${from}")` : ''}${dryRun ? ' (dry-run)' : ''}`
  );

  let attempted = 0;
  let written = 0;
  for (const target of targets) {
    if (attempted >= limit) break;
    attempted++;
    console.log(`\n[${attempted}] ${target.name}`);
    // Per-restaurant isolation: one unexpected throw (network, SDK, Sanity)
    // must not abort a batch over the whole catalog.
    try {
      const place = await fetchPlacePhotos(target.googlePlaceId);
      if (!place) continue;

      if (dryRun) {
        // Candidate count only — the photo uploads are the expensive part
        // and stay off in dry-run.
        const count = place.photos?.length ?? 0;
        console.log(
          `  candidates: ${Math.max(0, count - 1)} (photos minus hero) — would upload owner photos`
        );
        continue;
      }

      const assets = await importGalleryPhotos(place, target.slug, target.name);
      if (!assets.length) {
        // Re-importing can legitimately empty a gallery (a place with no owner
        // photos left) — clear the stale one.
        if (force) {
          await sanity.patch(target._id).unset(['gallery']).commit();
          console.log('  gallery:  nothing usable — cleared');
        } else {
          console.log('  gallery:  nothing usable — left empty');
        }
        continue;
      }
      const items = assets.map((g) => ({
        _key: randomUUID(),
        _type: 'image' as const,
        asset: { _type: 'reference' as const, _ref: g._id },
        alt: g.alt,
        ...(g.credit ? { credit: g.credit } : {}),
        ...(g.creditUrl ? { creditUrl: g.creditUrl } : {}),
      }));
      await sanity.patch(target._id).set({ gallery: items }).commit();
      written++;
      console.log(`  gallery:  ${items.length} photos written`);
      await sleep(500); // be polite to both APIs
    } catch (err) {
      console.error(
        `  ✗ ${target.name} (${target._id}):`,
        err instanceof Error ? err.message : err
      );
    }
  }
  console.log(
    `\nDone: ${attempted} attempted, ${written} galleries written, ${attempted - written} skipped.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
