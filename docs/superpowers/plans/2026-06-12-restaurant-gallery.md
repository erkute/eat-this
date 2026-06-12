# Restaurant-Galerie mit KI-Kuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurant-Detail-Sheet der Map zeigt zusätzlich zum Hero eine Galerie aus 3–4 kuratierten Google-Places-Fotos (Haiku-Vision-Scoring), mit Attribution pro Bild; Importer und Backfill befüllen das bestehende Sanity-`gallery`-Feld.

**Architecture:** Eine reine Kurationslogik (`scripts/lib/photo-curation.ts`, unit-getestet) wählt aus bis zu 9 Galerie-Kandidaten (`place.photos[1..9]`, `photos[0]` bleibt exklusiv Hero) die besten max. 4 per Claude-Haiku-Vision-Urteil. Der bestehende Importer (`runImport`) lädt die Gewinner als Sanity-Assets und schreibt sie nach `gallery`; ein idempotentes Backfill-Skript macht dasselbe für Bestandsrestaurants über Place Details. Frontend: `restaurantMapDetailQuery` projiziert `gallery` (lazy beim Sheet-Öffnen, Map-Initial-Load unberührt), eine neue `RestaurantGallery`-Komponente rendert den Streifen und öffnet die bestehende `MustEatImageLightbox` (um Credit-Props erweitert).

**Tech Stack:** Next.js App Router, Sanity (`@sanity/client`), Google Places API v1, `@anthropic-ai/sdk` (claude-haiku-4-5, bereits Dependency), Vitest, CSS Modules (`map.module.css`), framer-motion (Lightbox, existiert).

**Spec:** `docs/superpowers/specs/2026-06-12-restaurant-gallery-design.md`

**Repo-Regeln (CLAUDE.md), die hier greifen:**
- Branch `feat/restaurant-gallery` → PR in `staging`, nie direkt `main`.
- Nur explizit editierte Pfade stagen, nie `git add .`/`-A`/`-u`.
- Pre-push-Hook baut voll — aber bei neuem Branch (`-u`-Push) greift er nicht: vor dem ersten Push manuell `npm run build` (dev-Server vorher stoppen!).
- `npm test` nie gepipet laufen lassen (Exit-Code-Falle).
- Repo ist public: PR-Text knapp, keine TOS-/Rechts-Interna.

---

### Task 1: Kurationslogik `selectGalleryPhotos` (pur, TDD)

**Files:**
- Create: `nextjs/scripts/lib/photo-curation.ts`
- Test: `nextjs/scripts/lib/photo-curation.test.ts`

- [ ] **Step 1: Failing Test schreiben**

```ts
// nextjs/scripts/lib/photo-curation.test.ts
import { describe, it, expect } from 'vitest'
import { selectGalleryPhotos, type PhotoJudgment } from './photo-curation'

const j = (index: number, score: number, category: PhotoJudgment['category'] = 'interior'): PhotoJudgment =>
  ({ index, score, category })

describe('selectGalleryPhotos', () => {
  it('picks top-scored photos above threshold, max 4, sorted by score', () => {
    const judgments = [j(0, 9), j(1, 5), j(2, 8), j(3, 7), j(4, 6.5), j(5, 10)]
    expect(selectGalleryPhotos(judgments, 6)).toEqual([5, 0, 2, 3])
  })

  it('drops unusable photos regardless of score', () => {
    const judgments = [j(0, 9, 'unusable'), j(1, 7), j(2, 8)]
    expect(selectGalleryPhotos(judgments, 3)).toEqual([2, 1])
  })

  it('guarantees the best food shot is included when one is usable', () => {
    const judgments = [j(0, 9), j(1, 8.5), j(2, 8), j(3, 7.5), j(4, 6, 'food')]
    expect(selectGalleryPhotos(judgments, 5)).toEqual([4, 0, 1, 2])
  })

  it('returns empty when nothing clears the threshold', () => {
    expect(selectGalleryPhotos([j(0, 3), j(1, 5.9)], 2)).toEqual([])
  })

  it('falls back to the first 3 candidates when judgments are null (Haiku down)', () => {
    expect(selectGalleryPhotos(null, 5)).toEqual([0, 1, 2])
    expect(selectGalleryPhotos(null, 2)).toEqual([0, 1])
  })

  it('ignores judgments with out-of-range indexes', () => {
    expect(selectGalleryPhotos([j(7, 9), j(0, 8)], 2)).toEqual([0])
  })
})
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run (aus `nextjs/`): `npx vitest run scripts/lib/photo-curation.test.ts`
Expected: FAIL — `Cannot find module './photo-curation'`

- [ ] **Step 3: Minimale Implementierung**

```ts
// nextjs/scripts/lib/photo-curation.ts
/**
 * Pure selection logic for the restaurant photo gallery. Judgments come from
 * Haiku vision scoring (see judgePhotos below); selection is kept pure so it
 * is unit-testable without network. Hero (photos[0]) is excluded by the
 * CALLER — indexes here refer to the gallery candidate list (photos[1..]).
 */

export interface PhotoJudgment {
  index: number
  category: 'food' | 'interior' | 'exterior' | 'drink' | 'menu' | 'unusable'
  score: number
}

const MAX_GALLERY = 4
const SCORE_THRESHOLD = 6
const FALLBACK_COUNT = 3

/** Returns candidate indexes to keep, best first. `judgments === null`
 *  (scoring unavailable) falls back to the first 3 candidates unscored. */
export function selectGalleryPhotos(
  judgments: PhotoJudgment[] | null,
  candidateCount: number,
): number[] {
  if (judgments === null) {
    return Array.from({ length: Math.min(FALLBACK_COUNT, candidateCount) }, (_, i) => i)
  }
  const usable = judgments.filter(
    (jd) =>
      jd.category !== 'unusable' &&
      jd.score >= SCORE_THRESHOLD &&
      jd.index >= 0 &&
      jd.index < candidateCount,
  )
  const sorted = [...usable].sort((a, b) => b.score - a.score)
  const picked: PhotoJudgment[] = []
  // A food shot sells a restaurant better than three interiors — always keep
  // the best usable one, even if other categories out-score it.
  const bestFood = sorted.find((jd) => jd.category === 'food')
  if (bestFood) picked.push(bestFood)
  for (const jd of sorted) {
    if (picked.length >= MAX_GALLERY) break
    if (!picked.includes(jd)) picked.push(jd)
  }
  return picked.slice(0, MAX_GALLERY).map((jd) => jd.index)
}

/** German alt-text label per category, used for gallery image alt fields. */
export const CATEGORY_LABEL_DE: Record<PhotoJudgment['category'], string> = {
  food: 'Gericht',
  interior: 'Innenraum',
  exterior: 'Außenansicht',
  drink: 'Getränk',
  menu: 'Speisekarte',
  unusable: 'Foto',
}
```

- [ ] **Step 4: Test laufen lassen — muss grün sein**

Run: `npx vitest run scripts/lib/photo-curation.test.ts`
Expected: PASS (6 tests). Exit-Code direkt prüfen, nicht pipen.

- [ ] **Step 5: Commit**

```bash
git add nextjs/scripts/lib/photo-curation.ts nextjs/scripts/lib/photo-curation.test.ts
git commit -m "feat(gallery): pure photo curation selection logic"
```

---

### Task 2: Haiku-Vision-Scoring `judgePhotos`

**Files:**
- Modify: `nextjs/scripts/lib/photo-curation.ts` (Funktion anhängen)
- Test: `nextjs/scripts/lib/photo-curation.test.ts` (Parser-Test)

Netzwerk-Aufruf selbst wird nicht unit-getestet; die JSON-Parser-/Validierungslogik schon (eigene exportierte Funktion).

- [ ] **Step 1: Failing Test für den Response-Parser**

An `photo-curation.test.ts` anhängen:

```ts
import { parseJudgments } from './photo-curation'

describe('parseJudgments', () => {
  it('parses a clean JSON array', () => {
    const text = '[{"index":0,"category":"food","score":8.5},{"index":1,"category":"unusable","score":2}]'
    expect(parseJudgments(text, 2)).toEqual([
      { index: 0, category: 'food', score: 8.5 },
      { index: 1, category: 'unusable', score: 2 },
    ])
  })

  it('extracts the array from surrounding prose / code fences', () => {
    const text = 'Here you go:\n```json\n[{"index":0,"category":"interior","score":7}]\n```'
    expect(parseJudgments(text, 1)).toEqual([{ index: 0, category: 'interior', score: 7 }])
  })

  it('returns null on garbage or wrong shapes', () => {
    expect(parseJudgments('not json', 2)).toBeNull()
    expect(parseJudgments('[{"index":"a"}]', 2)).toBeNull()
    expect(parseJudgments('[{"index":0,"category":"selfie","score":5}]', 1)).toBeNull()
  })
})
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run scripts/lib/photo-curation.test.ts`
Expected: FAIL — `parseJudgments` not exported

- [ ] **Step 3: Parser + Haiku-Aufruf implementieren**

An `photo-curation.ts` anhängen:

```ts
import Anthropic from '@anthropic-ai/sdk'

const VALID_CATEGORIES = new Set(['food', 'interior', 'exterior', 'drink', 'menu', 'unusable'])

/** Tolerant JSON extraction for the model reply: accepts bare arrays or
 *  arrays inside prose/code fences. Returns null on any shape violation so
 *  callers fall back to unscored selection. */
export function parseJudgments(text: string, candidateCount: number): PhotoJudgment[] | null {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return null
  let raw: unknown
  try {
    raw = JSON.parse(match[0])
  } catch {
    return null
  }
  if (!Array.isArray(raw)) return null
  const out: PhotoJudgment[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null
    const { index, category, score } = item as Record<string, unknown>
    if (typeof index !== 'number' || !Number.isInteger(index)) return null
    if (typeof category !== 'string' || !VALID_CATEGORIES.has(category)) return null
    if (typeof score !== 'number' || Number.isNaN(score)) return null
    if (index < 0 || index >= candidateCount) continue
    out.push({ index, category: category as PhotoJudgment['category'], score })
  }
  return out
}

export interface JudgeInput {
  /** base64-encoded image bytes (≤ ~400px wide preview) */
  data: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
}

const JUDGE_MODEL = 'claude-haiku-4-5'

/** Scores gallery candidates with Haiku vision in ONE request (the model
 *  sees all photos and scores them relative to each other). Returns null on
 *  any failure — callers then fall back to the first 3 unscored. */
export async function judgePhotos(
  images: JudgeInput[],
  restaurantName: string,
): Promise<PhotoJudgment[] | null> {
  if (!images.length) return []
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const anthropic = new Anthropic()
    const content: Anthropic.ContentBlockParam[] = images.map((img, i) => ([
      { type: 'text' as const, text: `Photo ${i}:` },
      { type: 'image' as const, source: { type: 'base64' as const, media_type: img.mediaType, data: img.data } },
    ])).flat()
    content.push({
      type: 'text',
      text:
        `These are candidate gallery photos for the restaurant "${restaurantName}" on a curated vegan food map. ` +
        `Judge each photo. Respond with ONLY a JSON array, one entry per photo: ` +
        `[{"index": <photo number>, "category": "food"|"interior"|"exterior"|"drink"|"menu"|"unusable", "score": <0-10>}]. ` +
        `category "unusable": selfies, people as main subject, receipts, blurry/dark shots, parking lots, unrelated content. ` +
        `score: sharpness, exposure, composition, and how appetizing/inviting it looks. Be strict — 8+ only for genuinely good photos.`,
    })
    const res = await anthropic.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    })
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    return parseJudgments(text, images.length)
  } catch (err) {
    console.warn(`  photo judging failed: ${(err as Error).message} — falling back to unscored`)
    return null
  }
}
```

- [ ] **Step 4: Tests laufen lassen — alle grün**

Run: `npx vitest run scripts/lib/photo-curation.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add nextjs/scripts/lib/photo-curation.ts nextjs/scripts/lib/photo-curation.test.ts
git commit -m "feat(gallery): haiku vision judging + tolerant response parser"
```

---

### Task 3: Importer — Galerie-Fotos laden und in den Draft schreiben

**Files:**
- Modify: `nextjs/scripts/import-from-url.ts`
  - Attribution-Helper aus `importPhoto` extrahieren (~Zeile 408–446)
  - Neu: `importGalleryPhotos` (exportiert, damit Task 4 sie wiederverwendet)
  - `BuildContext` + `buildDoc` (~Zeile 462–521) um `galleryAssets` erweitern
  - `runImport` (~Zeile 614–641) + CLI-Log (~Zeile 673) verdrahten

`import-enriched.ts` braucht KEINE Änderung — es ruft `runImport` auf und erbt die Galerie automatisch.

- [ ] **Step 1: Attribution-Helper extrahieren**

In `import-from-url.ts`, direkt über `importPhoto` einfügen und `importPhoto` darauf umstellen (die Zeilen 430–441 ersetzen):

```ts
/** Credit/creditUrl from a photo's authorAttributions, with the Places
 *  placeholder string mapped to a clean "Foto: Google Maps" fallback. */
function photoAttribution(photo: NonNullable<Place['photos']>[number], place: Place) {
  const author = photo.authorAttributions?.[0]
  const displayName = author?.displayName
  const isPlaceholder = !displayName || /copyrighted by their owners/i.test(displayName)
  return {
    credit: isPlaceholder ? 'Foto: Google Maps' : `Foto: ${displayName}`,
    creditUrl: isPlaceholder ? (place.googleMapsUri ?? null) : (author?.uri ?? null),
  }
}
```

In `importPhoto` wird der Block ab `const author = photo.authorAttributions?.[0]` bis zum `return`-Objekt zu:

```ts
    const { credit, creditUrl } = photoAttribution(photo, place)
    return { _id: asset._id, credit, creditUrl }
```

- [ ] **Step 2: `importGalleryPhotos` implementieren**

Nach `importPhoto` einfügen (Imports oben ergänzen: `import { judgePhotos, selectGalleryPhotos, CATEGORY_LABEL_DE, type JudgeInput, type PhotoJudgment } from './lib/photo-curation'`):

```ts
export interface GalleryAsset {
  _id: string
  alt: string
  credit: string | null
  creditUrl: string | null
}

const GALLERY_MAX_CANDIDATES = 9

/** Downloads small previews of photos[1..9], has Haiku score them, then
 *  uploads only the winners in full size. photos[0] stays hero-only so the
 *  gallery never duplicates the hero. Every failure path degrades softly:
 *  a failed preview drops that candidate, a failed judging falls back to
 *  "first 3 unscored", a failed full-size upload skips that one photo. */
export async function importGalleryPhotos(
  place: Pick<Place, 'photos' | 'googleMapsUri'>,
  restaurantSlug: string,
  restaurantName: string,
): Promise<GalleryAsset[]> {
  const candidates = (place.photos ?? []).slice(1, 1 + GALLERY_MAX_CANDIDATES).filter((p) => p?.name)
  if (!candidates.length) return []

  // 1) Small previews for judging (cheap: 400px media calls)
  const previews: { photo: (typeof candidates)[number]; input: JudgeInput }[] = []
  for (const photo of candidates) {
    try {
      const url = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=400&key=${GOOGLE_API_KEY}`
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) continue
      const buffer = Buffer.from(await res.arrayBuffer())
      const ct = res.headers.get('content-type') ?? 'image/jpeg'
      const mediaType = (['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const)
        .find((m) => ct.includes(m.split('/')[1])) ?? 'image/jpeg'
      previews.push({ photo, input: { data: buffer.toString('base64'), mediaType } })
    } catch {
      // drop this candidate
    }
  }
  if (!previews.length) return []

  // 2) Judge + select (indexes refer to the previews array)
  const judgments = await judgePhotos(previews.map((p) => p.input), restaurantName)
  const pickedIdx = selectGalleryPhotos(judgments, previews.length)
  if (!pickedIdx.length) {
    console.log('  gallery:  no candidates cleared the quality bar')
    return []
  }

  // 3) Upload winners in full size
  const out: GalleryAsset[] = []
  for (const idx of pickedIdx) {
    const { photo } = previews[idx]
    try {
      const url = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1600&key=${GOOGLE_API_KEY}`
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) continue
      const buffer = Buffer.from(await res.arrayBuffer())
      const contentType = res.headers.get('content-type') ?? 'image/jpeg'
      const ext = contentType.includes('png') ? 'png' : 'jpg'
      const asset = await sanity.assets.upload('image', buffer, {
        filename: `${restaurantSlug}-gallery-${out.length + 1}.${ext}`,
        contentType,
      })
      const category: PhotoJudgment['category'] =
        judgments?.find((jd) => jd.index === idx)?.category ?? 'interior'
      const { credit, creditUrl } = photoAttribution(photo, place as Place)
      out.push({
        _id: asset._id,
        alt: `${restaurantName} – ${CATEGORY_LABEL_DE[category]}`,
        credit,
        creditUrl,
      })
    } catch (err) {
      console.warn(`  gallery photo upload failed: ${(err as Error).message} — skipping`)
    }
  }
  return out
}
```

Hinweis: `photoAttribution` nutzt von `place` nur `googleMapsUri` — der `as Place`-Cast ist deshalb safe; alternativ die Helper-Signatur auf `Pick<Place, 'googleMapsUri'>` schmälern (bevorzugt, wenn TS meckert).

- [ ] **Step 3: `buildDoc` + `runImport` verdrahten**

`BuildContext` (Zeile ~462) erweitern:

```ts
interface BuildContext {
  bezirkRefId: string | null
  ortsteil: string | null
  photoAsset: PhotoAsset | null
  galleryAssets: GalleryAsset[]
  categoryRefs: { _key: string; _type: 'reference'; _ref: string }[]
  slug: string
}
```

In `buildDoc`, direkt nach dem `ctx.photoAsset`-Block (Zeile ~518):

```ts
  if (ctx.galleryAssets.length) {
    doc.gallery = ctx.galleryAssets.map((g) => {
      const item: Record<string, unknown> = {
        _key: randomUUID(),
        _type: 'image',
        asset: { _type: 'reference', _ref: g._id },
        alt: g.alt,
      }
      if (g.credit) item.credit = g.credit
      if (g.creditUrl) item.creditUrl = g.creditUrl
      return item
    })
  }
```

In `runImportFromParsed` (Zeile ~618), nach der `photoAsset`-Zeile:

```ts
  const galleryAssets = uploadPhoto ? await importGalleryPhotos(place, slug, matchedName) : []
```

…und `galleryAssets` in den `buildDoc`-Context (Zeile ~623) aufnehmen. Im CLI-`main` nach dem Foto-Log (Zeile ~675):

```ts
  const galleryCount = Array.isArray(result.doc.gallery) ? result.doc.gallery.length : 0
  if (galleryCount) console.log(`  gallery:  ${galleryCount} photos uploaded`)
```

(Falls `RunImportResult` das Doc nur als `Record<string, unknown>` führt, reicht der Array-Check wie gezeigt.)

- [ ] **Step 4: Typecheck + bestehende Tests**

Run: `npx tsc --noEmit` und `npm test` (jeweils Exit-Code prüfen)
Expected: beide PASS, keine neuen Fehler

- [ ] **Step 5: Commit**

```bash
git add nextjs/scripts/import-from-url.ts
git commit -m "feat(gallery): importer uploads curated gallery photos"
```

---

### Task 4: Backfill-Skript für Bestandsrestaurants

**Files:**
- Create: `nextjs/scripts/backfill-gallery.ts`

- [ ] **Step 1: Skript schreiben**

```ts
/**
 * Backfills the `gallery` field for existing restaurants from Google Places
 * photos, curated via Haiku vision scoring (see scripts/lib/photo-curation).
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/backfill-gallery.ts --dry-run            # judge + log picks, no writes
 *   npx tsx scripts/backfill-gallery.ts --limit 5            # first 5 restaurants only
 *   npx tsx scripts/backfill-gallery.ts                      # full run
 *
 * Idempotent: restaurants with a non-empty gallery are skipped. Costs per
 * restaurant: 1 Place-Details call + up to 9 preview photo calls + up to 4
 * full-size photo calls (~7 USD / 1000 photo calls) + <1 ct Haiku.
 *
 * Required env (nextjs/.env.local):
 *   SANITY_API_WRITE_TOKEN, GOOGLE_API_KEY, ANTHROPIC_API_KEY
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import { randomUUID } from 'node:crypto'
import { importGalleryPhotos } from './import-from-url'

loadEnv({ path: '.env.local' })

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

interface Target {
  _id: string
  name: string
  slug: string
  googlePlaceId: string
}

interface PlacePhotosResponse {
  photos?: {
    name: string
    authorAttributions?: { displayName?: string; uri?: string }[]
  }[]
  googleMapsUri?: string
}

async function fetchPlacePhotos(placeId: string): Promise<PlacePhotosResponse | null> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=de`, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_API_KEY!,
      'X-Goog-FieldMask': 'photos,googleMapsUri',
    },
  })
  if (!res.ok) {
    console.warn(`  place details ${res.status} — skipping`)
    return null
  }
  return res.json()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.indexOf('--limit')
  const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity

  if (!GOOGLE_API_KEY || !process.env.SANITY_API_WRITE_TOKEN) {
    console.error('Missing GOOGLE_API_KEY / SANITY_API_WRITE_TOKEN in .env.local')
    process.exit(1)
  }

  const targets = await sanity.fetch<Target[]>(
    `*[_type == "restaurant" && defined(googlePlaceId) && !(_id in path("drafts.**"))
       && (!defined(gallery) || count(gallery) == 0)]
       | order(name asc) { _id, name, "slug": slug.current, googlePlaceId }`,
  )
  console.log(`${targets.length} restaurants without gallery${dryRun ? ' (dry-run)' : ''}`)

  let done = 0
  for (const target of targets) {
    if (done >= limit) break
    done++
    console.log(`\n[${done}] ${target.name}`)
    const place = await fetchPlacePhotos(target.googlePlaceId)
    if (!place) continue

    if (dryRun) {
      // Judge-only pass: report candidate count without uploads — uploads
      // are the expensive/visible part.
      const count = place.photos?.length ?? 0
      console.log(`  candidates: ${Math.max(0, count - 1)} (photos minus hero) — would curate & upload`)
      continue
    }

    const assets = await importGalleryPhotos(place, target.slug, target.name)
    if (!assets.length) {
      console.log('  gallery:  nothing usable — left empty')
      continue
    }
    const items = assets.map((g) => ({
      _key: randomUUID(),
      _type: 'image' as const,
      asset: { _type: 'reference' as const, _ref: g._id },
      alt: g.alt,
      ...(g.credit ? { credit: g.credit } : {}),
      ...(g.creditUrl ? { creditUrl: g.creditUrl } : {}),
    }))
    await sanity.patch(target._id).set({ gallery: items }).commit()
    console.log(`  gallery:  ${items.length} photos written`)
    await sleep(500) // be polite to both APIs
  }
  console.log(`\nDone: ${done} processed.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

Hinweis für den Implementierer: `importGalleryPhotos` lädt selbst hoch über den `sanity`-Client AUS `import-from-url.ts` (gleiche Projekt/Dataset-Konstanten) — der lokale Client hier dient nur für fetch/patch. Das ist okay, beide zeigen auf dasselbe Dataset.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. `PlacePhotosResponse` ist strukturell kompatibel zur `Pick<Place, 'photos' | 'googleMapsUri'>`-Signatur aus Task 3 (alle abweichenden Felder sind optional).

- [ ] **Step 3: Dry-Run gegen echte Daten**

Run: `npx tsx scripts/backfill-gallery.ts --dry-run` (aus `nextjs/`)
Expected: Liste aller Restaurants ohne Galerie + Kandidaten-Counts, KEINE Sanity-Writes. Anzahl notieren — sie bestimmt die einmaligen API-Kosten.

- [ ] **Step 4: Commit**

```bash
git add nextjs/scripts/backfill-gallery.ts
git commit -m "feat(gallery): backfill script for existing restaurants"
```

**WICHTIG:** Der echte Backfill-Lauf (ohne `--dry-run`) passiert erst NACH Merge + User-Freigabe (Task 8) — er schreibt direkt ins Produktions-Dataset.

---

### Task 5: Preset, GROQ-Projektion, Detail-Hook-Typ

**Files:**
- Modify: `nextjs/lib/sanity-image-presets.ts:30` (Preset ergänzen)
- Modify: `nextjs/lib/map/queries.ts:40-54` (`restaurantMapDetailQuery`)
- Modify: `nextjs/lib/map/useRestaurantDetail.ts:6-18` (Typ)

- [ ] **Step 1: Preset `galleryThumb` ergänzen**

In `IMAGE_PRESETS` (nach `buddyThumb`):

```ts
  // Restaurant detail-sheet gallery strip (fixed 4:3 crop for a uniform look)
  galleryThumb: { w: 400, h: 300, fit: 'crop', q: 80 },
```

- [ ] **Step 2: GROQ-Projektion erweitern**

`queries.ts`: Import um `presetQuery` ergänzen (`groqImageUrl` wird dort schon importiert — gleiche Quelle `@/lib/sanity-image-presets`). In `restaurantMapDetailQuery` nach `"photoCreditUrl": image.creditUrl` ein Komma und:

```ts
    "gallery": gallery[]{
      _key,
      "thumb": asset->url + "${presetQuery('galleryThumb')}",
      "full": asset->url + "${presetQuery('detailHero')}",
      alt,
      credit,
      creditUrl
    }
```

(Template-Literal — die Query ist bereits ein Backtick-String; `${…}` wird zur Buildzeit interpoliert wie bei `groqImageUrl` eine Zeile drüber.)

- [ ] **Step 3: Hook-Typ erweitern**

`useRestaurantDetail.ts`, über `RestaurantMapDetail`:

```ts
export interface RestaurantGalleryImage {
  _key: string
  thumb: string
  full: string
  alt?: string
  credit?: string
  creditUrl?: string
}
```

…und in `RestaurantMapDetail`:

```ts
  gallery?: RestaurantGalleryImage[]
```

- [ ] **Step 4: Typecheck + API-Smoke**

Run: `npx tsc --noEmit`
Expected: PASS
Optionaler Smoke (dev-Server an): `curl -s localhost:3000/api/restaurant-detail/<bekannter-slug> | head -c 400` — `gallery` ist `null`/fehlt (noch keine Daten), kein 500.

- [ ] **Step 5: Commit**

```bash
git add nextjs/lib/sanity-image-presets.ts nextjs/lib/map/queries.ts nextjs/lib/map/useRestaurantDetail.ts
git commit -m "feat(gallery): gallery projection in map detail query"
```

---

### Task 6: Lightbox-Credit + `RestaurantGallery`-Komponente

**Files:**
- Modify: `nextjs/app/components/map/MustEatImageLightbox.tsx` (optionale Credit-Props)
- Create: `nextjs/app/components/map/RestaurantGallery.tsx`
- Modify: `nextjs/app/components/map/map.module.css` (Styles anhängen)

- [ ] **Step 1: Lightbox um Credit erweitern**

`MustEatImageLightbox.tsx`:

1. `Props` und `InnerProps` ergänzen:

```ts
  credit?: string | null
  creditUrl?: string | null
```

2. `Inner` destrukturiert `credit, creditUrl` mit; im JSX direkt NACH dem schließenden `</div>` von `lightboxClip` (Zeile ~184), noch innerhalb von `lightboxCard`:

```tsx
        {credit && (
          <span className={styles.lightboxCredit}>
            {creditUrl
              ? <a href={creditUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{credit}</a>
              : credit}
          </span>
        )}
```

3. Im Default-Export `credit`/`creditUrl` durchreichen (Props an `Inner`).

Bestehende Aufrufer (Must-Eat-Karten) übergeben nichts → Verhalten unverändert.

- [ ] **Step 2: Galerie-Komponente erstellen**

```tsx
// nextjs/app/components/map/RestaurantGallery.tsx
'use client'
import { useState } from 'react'
import MustEatImageLightbox from './MustEatImageLightbox'
import type { RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail'
import styles from './map.module.css'

interface Props {
  images: RestaurantGalleryImage[]
  restaurantName: string
}

// Horizontal swipe strip of curated Places photos under the detail hero.
// Tapping a thumb flies it into the existing MustEatImageLightbox; per-photo
// credit shows as a thumb overlay and full-size in the lightbox (Places
// attribution requirement).
export default function RestaurantGallery({ images, restaurantName }: Props) {
  const [open, setOpen] = useState<{ img: RestaurantGalleryImage; rect: DOMRect } | null>(null)
  if (!images.length) return null
  return (
    <>
      <div className={styles.rdGallery} role="list" aria-label="Fotos">
        {images.map((img) => (
          <button
            key={img._key}
            type="button"
            role="listitem"
            className={styles.rdGalleryThumb}
            onClick={(e) => setOpen({ img, rect: e.currentTarget.getBoundingClientRect() })}
          >
            <img src={img.thumb} alt={img.alt ?? restaurantName} loading="lazy" decoding="async" />
            {img.credit && <span className={styles.rdGalleryCredit} aria-hidden="true">{img.credit}</span>}
          </button>
        ))}
      </div>
      <MustEatImageLightbox
        imageUrl={open?.img.full ?? ''}
        alt={open?.img.alt ?? restaurantName}
        credit={open?.img.credit}
        creditUrl={open?.img.creditUrl}
        originRect={open?.rect ?? null}
        onClose={() => setOpen(null)}
      />
    </>
  )
}
```

- [ ] **Step 3: CSS anhängen** (`map.module.css`, ans Dateiende)

```css
/* ---- Restaurant detail gallery strip ---- */
.rdGallery {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 12px 16px 4px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.rdGallery::-webkit-scrollbar { display: none; }
.rdGalleryThumb {
  position: relative;
  flex: 0 0 auto;
  width: 148px;
  aspect-ratio: 4 / 3;
  border: 0;
  padding: 0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  scroll-snap-align: start;
  background: rgba(127, 127, 127, 0.12);
}
.rdGalleryThumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.rdGalleryCredit {
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 4px;
  font-size: 9px;
  line-height: 1.2;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}
.lightboxCredit {
  display: block;
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: #fff;
}
.lightboxCredit a {
  color: inherit;
  text-decoration: underline;
}
```

(Kein `npm run build:css` nötig — `map.module.css` ist ein CSS-Module im Next-Build, nicht Teil von `nextjs/css/` → `public/css/`.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add nextjs/app/components/map/RestaurantGallery.tsx nextjs/app/components/map/MustEatImageLightbox.tsx nextjs/app/components/map/map.module.css
git commit -m "feat(gallery): gallery strip component + lightbox credit"
```

---

### Task 7: In `RestaurantDetail` einhängen

**Files:**
- Modify: `nextjs/app/components/map/RestaurantDetail.tsx` (Import + Render nach dem Pager, ~Zeile 262)

- [ ] **Step 1: Einbauen**

Import oben ergänzen:

```ts
import RestaurantGallery from './RestaurantGallery'
```

Im JSX zwischen dem PAGER-`</nav>`-Block (endet ~Zeile 262) und dem BODY-Kommentar:

```tsx
        {/* GALLERY — curated Places photos, lazy via the same detail fetch */}
        {!!r.gallery?.length && (
          <RestaurantGallery images={r.gallery} restaurantName={displayName} />
        )}
```

`r` ist bereits der Merge aus Map-Payload + Lazy-Detail (`{ ...restaurant, ...detail }`, Zeile 96–99) — `gallery` kommt da automatisch an, gleiches Muster wie `r.photoCredit`.

- [ ] **Step 2: Manuell verifizieren**

1. Dev-Server: `npm run dev` (aus `nextjs/`)
2. Einem Test-Restaurant in Sanity Studio von Hand 2 Bilder ins `gallery`-Feld legen (mit `credit`), ODER zuerst `npx tsx scripts/backfill-gallery.ts --limit 1` laufen lassen (schreibt EIN Restaurant in Prod — mit User-OK).
3. Map öffnen → Restaurant antippen → Galerie-Streifen unter Hero/Pager sichtbar, Thumbs 4:3, Credit-Overlay lesbar, Tap öffnet Lightbox mit Credit, Schließen animiert zurück.
4. Restaurant OHNE Galerie öffnen → kein leerer Streifen, Layout wie vorher.

- [ ] **Step 3: Tests + Typecheck**

Run: `npm test` und `npx tsc --noEmit` (Exit-Codes prüfen)
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add nextjs/app/components/map/RestaurantDetail.tsx
git commit -m "feat(gallery): render gallery strip in restaurant detail sheet"
```

---

### Task 8: Build, PR nach staging, Backfill-Freigabe

- [ ] **Step 1: Voller Build (Pflicht — Pre-push-Hook greift bei neuem Branch nicht)**

Dev-Server STOPPEN, dann: `npm run build` (aus `nextjs/`)
Expected: Build grün. Bei `UND_ERR_CONNECT_TIMEOUT` (Sanity-CDN) einmal wiederholen.

- [ ] **Step 2: `git status` lesen, nur eigene Pfade prüfen**

Run: `git status` und `git log origin/main..HEAD --stat`
Expected: ausschließlich die in Tasks 1–7 committeten Dateien + Spec/Plan-Docs. Fremde staged Files → stoppen und User fragen (Parallel-Sessions!).

- [ ] **Step 3: Push + PR nach `staging`**

```bash
git push -u origin feat/restaurant-gallery
gh pr create --base staging --title "feat: curated photo gallery on restaurant detail sheet" --body "$(cat <<'EOF'
Adds a horizontal photo gallery to the map's restaurant detail sheet, fed from the existing Sanity `gallery` field. Importer + backfill script curate up to 4 photos per restaurant (vision-scored), each with per-photo credit; lightbox shows full attribution.

- importer: upload curated gallery photos alongside the hero
- new `scripts/backfill-gallery.ts` (idempotent, `--dry-run`/`--limit`)
- map detail query ships `gallery` lazily with the existing detail fetch
- new `RestaurantGallery` strip + credit support in the lightbox

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

(PR-Text bewusst knapp, Repo ist public.)

- [ ] **Step 4: Staging-Smoke + Backfill-Plan an User**

Nach Merge in `staging`: Map auf der Staging-URL öffnen (Basic Auth), Galerie an einem Testdatensatz prüfen. Dann dem User melden: Anzahl Restaurants aus dem Dry-Run + geschätzte Einmalkosten, und **Freigabe für den echten Backfill-Lauf einholen** (`npx tsx scripts/backfill-gallery.ts`, schreibt ins Prod-Dataset; ggf. erst `--limit 5` und Ergebnis im Studio reviewen).

---

## Risiken / Hinweise

- **Backfill schreibt in Prod-Content** (ein Dataset, kein Staging-Content): deshalb Dry-Run → `--limit 5` → Review → Vollauf, jeweils mit User-OK.
- **Haiku-Urteil ist nicht deterministisch:** identische Re-Runs können andere Picks liefern — egal, da idempotent (befüllte Galerien werden übersprungen).
- **`photos[0]`-Heuristik:** Bei Bestandsrestaurants ist das Hero historisch `photos[0]`; falls Google die Reihenfolge inzwischen geändert hat, kann vereinzelt ein Hero-Duplikat in der Galerie landen. Akzeptiert (Spec), fällt im Studio-Review des `--limit 5`-Laufs auf.
- **Kosten Vollauf:** ~1 Details-Call + ≤9 Preview- + ≤4 Full-Calls pro Restaurant; bei ~200 Restaurants grob 15–20 USD einmalig + <2 USD Haiku.
