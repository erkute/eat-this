# Home Bezirks-Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the two home sections "Bezirk der Woche" + "weitere Bezirke" into one always-dark, interactive district switcher.

**Architecture:** A pure assembly helper builds a single `HubDistrict[]` (feature district first + marker, rest by spot count, cap 10) from two Sanity queries. A `'use client'` tab component renders **all** panels into SSR HTML (inactive ones `hidden` for SEO-crawlable links) but only mounts images for the active panel. Old `HubBezirkOfWeek` + the sticker-wall `HubBezirke` are deleted.

**Tech Stack:** Next.js App Router, React client component (`useState`), CSS Modules, next-intl v4, Sanity GROQ, Vitest + `react-dom/server`.

**Spec:** `docs/specs/2026-06-14-home-bezirke-switcher-design.md`

**Working directory for all commands:** `nextjs/` (run `cd nextjs` first). Branch: `feat/home-bezirke-switcher` (already created, spec committed).

---

### Task 1: Pure assembly helper + types (TDD)

**Files:**
- Create: `nextjs/lib/home/assembleDistricts.ts`
- Test: `nextjs/lib/home/assembleDistricts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `nextjs/lib/home/assembleDistricts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { assembleDistricts, type DistrictRow, type FeatureRaw, type HubDistrictSpot } from './assembleDistricts'

const spot = (slug: string): HubDistrictSpot => ({ name: slug, slug, image: `https://cdn/${slug}.jpg`, category: 'Lunch' })

const row = (slug: string, count: number): DistrictRow => ({
  name: slug, slug, tagline: `tag-${slug}`, count, spots: [spot(`${slug}-1`), spot(`${slug}-2`)],
})

describe('assembleDistricts', () => {
  it('puts the feature district first, marks it, and removes its duplicate from the rest', () => {
    const feature: FeatureRaw = { name: 'Neukölln', slug: 'neukoelln', tagline: 'feat-tag', spots: [spot('curated-1')] }
    const rows = [row('mitte', 77), row('neukoelln', 30), row('kreuzberg', 58)]
    const out = assembleDistricts(feature, rows)
    expect(out[0].slug).toBe('neukoelln')
    expect(out[0].isFeature).toBe(true)
    expect(out.filter(d => d.slug === 'neukoelln')).toHaveLength(1)
    expect(out.slice(1).every(d => d.isFeature === false)).toBe(true)
  })

  it('uses curated feature spots and tagline when present', () => {
    const feature: FeatureRaw = { name: 'Neukölln', slug: 'neukoelln', tagline: 'feat-tag', spots: [spot('curated-1')] }
    const out = assembleDistricts(feature, [row('neukoelln', 30)])
    expect(out[0].spots).toHaveLength(1)
    expect(out[0].spots[0].slug).toBe('curated-1')
    expect(out[0].tagline).toBe('feat-tag')
  })

  it('falls back to the matching row spots/tagline when the feature has no curated spots', () => {
    const feature: FeatureRaw = { name: 'Neukölln', slug: 'neukoelln', tagline: null, spots: [] }
    const out = assembleDistricts(feature, [row('neukoelln', 30)])
    expect(out[0].spots.map(s => s.slug)).toEqual(['neukoelln-1', 'neukoelln-2'])
    expect(out[0].tagline).toBe('tag-neukoelln')
  })

  it('returns rows as-is (no feature marker) when feature is null', () => {
    const out = assembleDistricts(null, [row('mitte', 77), row('kreuzberg', 58)])
    expect(out).toHaveLength(2)
    expect(out.every(d => d.isFeature === false)).toBe(true)
    expect(out[0].slug).toBe('mitte')
  })

  it('caps the result at 10 districts', () => {
    const rows = Array.from({ length: 14 }, (_, i) => row(`b${i}`, 100 - i))
    expect(assembleDistricts(null, rows)).toHaveLength(10)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nextjs && npx vitest run lib/home/assembleDistricts.test.ts`
Expected: FAIL — `Failed to resolve import "./assembleDistricts"`.

- [ ] **Step 3: Write minimal implementation**

Create `nextjs/lib/home/assembleDistricts.ts`:

```ts
export interface HubDistrictSpot {
  name: string
  slug: string
  image: string | null
  category: string | null
}

export interface HubDistrict {
  name: string
  slug: string
  tagline: string | null
  isFeature: boolean
  spots: HubDistrictSpot[]
}

/** A browsable district row from the districts GROQ query (already ≥5 spots, ordered by count desc). */
export interface DistrictRow {
  name: string
  slug: string
  tagline: string | null
  count: number
  spots: HubDistrictSpot[]
}

/** The editorial "Bezirk der Woche" from the homeWeek doc. `spots` are the curated picks (may be empty). */
export interface FeatureRaw {
  name: string
  slug: string
  tagline: string | null
  spots: HubDistrictSpot[]
}

/**
 * Build the unified district list for the home switcher: editorial feature first
 * (marked), the rest by spot count. Feature uses its curated spots/tagline when
 * present, otherwise falls back to the matching auto-picked row. Capped at `cap`.
 */
export function assembleDistricts(
  feature: FeatureRaw | null,
  rows: DistrictRow[],
  cap = 10,
): HubDistrict[] {
  const others: HubDistrict[] = rows.map((r) => ({
    name: r.name,
    slug: r.slug,
    tagline: r.tagline,
    isFeature: false,
    spots: r.spots,
  }))

  if (!feature || !feature.slug) return others.slice(0, cap)

  const rowMatch = rows.find((r) => r.slug === feature.slug)
  const featureDistrict: HubDistrict = {
    name: feature.name,
    slug: feature.slug,
    tagline: feature.tagline ?? rowMatch?.tagline ?? null,
    isFeature: true,
    spots: feature.spots.length ? feature.spots : (rowMatch?.spots ?? []),
  }

  const rest = others.filter((d) => d.slug !== feature.slug)
  return [featureDistrict, ...rest].slice(0, cap)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd nextjs && npx vitest run lib/home/assembleDistricts.test.ts`
Expected: PASS — 5 passed.

- [ ] **Step 5: Commit**

```bash
cd nextjs && git add lib/home/assembleDistricts.ts lib/home/assembleDistricts.test.ts
git commit -m "feat: assembleDistricts helper for home district switcher

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Wire the queries into getHomeData

**Files:**
- Modify: `nextjs/lib/home/getHomeData.ts`

This task swaps the `bezirkOfWeek` + `bezirke` data for a single `districts` field. There is no unit test (the function performs live Sanity fetches); the assembly logic it relies on is already tested in Task 1, and the build in Task 8 type-checks the wiring.

- [ ] **Step 1: Replace the interfaces and HomeData field**

In `nextjs/lib/home/getHomeData.ts`, delete these three interfaces:

```ts
interface HubBezirkSpot {
  _id: string
  name: string
  slug: string
  image: string | null
  category: string | null
}

export interface HubBezirk {
  name: string
  slug: string
  tagline: string | null
  spots: HubBezirkSpot[]
}
```

and

```ts
export interface HubBezirkChip {
  name: string
  slug: string
  count: number
}
```

At the top of the file (after the existing imports), add:

```ts
import { assembleDistricts, type FeatureRaw, type DistrictRow } from './assembleDistricts'
export type { HubDistrict, HubDistrictSpot } from './assembleDistricts'
```

In the `HomeData` interface, replace these two lines:

```ts
  bezirkOfWeek: HubBezirk | null
  bezirke: HubBezirkChip[]
```

with:

```ts
  districts: import('./assembleDistricts').HubDistrict[]
```

- [ ] **Step 2: Replace the feature query and add the districts query**

Replace the whole `bezirkOfWeekQuery` constant:

```ts
const bezirkOfWeekQuery = `*[_type == "homeWeek" && weekStart <= $today] | order(weekStart desc)[0]{
  "name": bezirk->name,
  "slug": bezirk->slug.current,
  "tagline": bezirkTagline,
  "spots": bezirkSpots[]->{
    _id,
    "name": name,
    "slug": slug.current,
    "image": image.asset->url,
    "category": select($locale == "en" => categories[0]->nameEn, categories[0]->name)
  }
}`
```

with:

```ts
const featureQuery = `*[_type == "homeWeek" && weekStart <= $today] | order(weekStart desc)[0]{
  "name": bezirk->name,
  "slug": bezirk->slug.current,
  "tagline": coalesce(bezirkTagline, select($locale == "en" => coalesce(bezirk->descriptionEn, bezirk->description), bezirk->description)),
  "spots": coalesce(bezirkSpots[]->{
    "name": name,
    "slug": slug.current,
    "image": image.asset->url,
    "category": select($locale == "en" => categories[0]->nameEn, categories[0]->name)
  }, [])
}`

const districtsQuery = `*[_type == "bezirk" && defined(slug.current)]{
  "name": name,
  "slug": slug.current,
  "tagline": select($locale == "en" => coalesce(descriptionEn, description), description),
  "count": count(*[_type == "restaurant" && isOpen == true && !(_id in path("drafts.**")) && references(^._id)]),
  "spots": *[_type == "restaurant" && isOpen == true && defined(image) && !(_id in path("drafts.**")) && references(^._id)] | order(featured desc, count(*[_type == "mustEat" && references(^._id)]) desc)[0...4]{
    "name": name,
    "slug": slug.current,
    "image": image.asset->url,
    "category": select($locale == "en" => categories[0]->nameEn, categories[0]->name)
  }
}[count >= 5] | order(count desc)`
```

- [ ] **Step 3: Swap the fetches in the Promise.all**

In `getHomeData`, the `Promise.all` currently destructures
`[candidates, freeSurface, categories, bezirkOfWeek, articles, catNameRows, bezirkRows]`.
Change it to fetch the feature + districts instead of `bezirkOfWeek` + `getAllBezirkeWithStats()`:

Replace this destructure + array:

```ts
  const [candidates, freeSurface, categories, bezirkOfWeek, articles, catNameRows, bezirkRows] = await Promise.all([
```

with:

```ts
  const [candidates, freeSurface, categories, feature, districtRows, articles, catNameRows] = await Promise.all([
```

Inside the array, replace this line:

```ts
    client.fetch<HubBezirk | null>(bezirkOfWeekQuery, { locale, today }, { next: { revalidate: 3600, tags: ['homeWeek'] } }),
```

with these two lines:

```ts
    client.fetch<FeatureRaw | null>(featureQuery, { locale, today }, { next: { revalidate: 3600, tags: ['homeWeek'] } }),
    client.fetch<DistrictRow[]>(districtsQuery, { locale }, { next: { revalidate: 3600, tags: ['bezirk', 'restaurant', 'mustEat'] } }),
```

and delete this line (the `getAllBezirkeWithStats()` call):

```ts
    getAllBezirkeWithStats(),
```

- [ ] **Step 4: Replace the chip-building block and the return value**

Delete this block (the `bezirke` chips):

```ts
  // Browse-by-district chips → /map?bezirk=. Only districts with a real
  // selection (≥5 open spots) — a near-empty filter would be a dead end.
  // Most-populated first.
  const bezirke: HubBezirkChip[] = (bezirkRows ?? [])
    .filter((b) => b.slug && (b.restaurantCount ?? 0) >= 5)
    .sort((a, b) => (b.restaurantCount ?? 0) - (a.restaurantCount ?? 0))
    .map((b) => ({ name: b.name, slug: b.slug, count: b.restaurantCount ?? 0 }))
```

and add, just before the final `return`:

```ts
  // Unified district switcher: editorial feature first (marked), rest by spot
  // count. Feature keeps its curated picks; others get featured→must-eat ranked
  // auto-picks. Capped at 10 tabs.
  const districts = assembleDistricts(feature, districtRows ?? [])
```

In the final `return { ... }`, replace `bezirkOfWeek, bezirke,` with `districts,`. The line becomes:

```ts
  return { spotOfDay: pickSpotOfDay(candidates, today), newOnMap, categories: homeCategories, districts, magazine, categoryNames }
```

- [ ] **Step 5: Remove the now-unused import**

In the import on line 2, remove `getAllBezirkeWithStats` (keep `getAllNewsArticles`). It becomes:

```ts
import { getAllNewsArticles } from '@/lib/sanity.server'
```

(Verify `getAllBezirkeWithStats` is not referenced elsewhere in this file with: `grep -n getAllBezirkeWithStats lib/home/getHomeData.ts` → no matches.)

- [ ] **Step 6: Type-check this file**

Run: `cd nextjs && npx tsc --noEmit`
Expected: no errors in `getHomeData.ts`. (Errors in `HubBezirkOfWeek.tsx` / `HubBezirke.tsx` / `HubSection.tsx` are expected at this point — they are fixed in Tasks 3, 6.)

- [ ] **Step 7: Commit**

```bash
cd nextjs && git add lib/home/getHomeData.ts
git commit -m "feat: getHomeData provides unified districts list

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: New HubBezirke switcher component + CSS

**Files:**
- Overwrite: `nextjs/app/components/HubBezirke.tsx`
- Overwrite: `nextjs/app/components/HubBezirke.module.css`

- [ ] **Step 1: Write the component**

Overwrite `nextjs/app/components/HubBezirke.tsx` with:

```tsx
'use client'

import { useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { normalizeName } from '@/lib/normalizeName'
import type { HubDistrict } from '@/lib/home/getHomeData'
import styles from './HubBezirke.module.css'

interface Props {
  districts: HubDistrict[]
}

// One always-dark block that merges "Bezirk der Woche" + browse-by-district.
// Every district panel is rendered into the SSR HTML (inactive ones `hidden`)
// so all /bezirk/[slug] and /restaurant/[slug] links stay crawlable; only the
// active panel mounts its <Image>s to keep image requests to four at a time.
export default function HubBezirke({ districts }: Props) {
  const t = useTranslations('hub.bezirke')
  const [active, setActive] = useState(0)
  if (districts.length === 0) return null

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = e.key === 'ArrowRight' ? (i + 1) % districts.length : (i - 1 + districts.length) % districts.length
    setActive(next)
    const sibling = e.currentTarget.parentElement?.children[next] as HTMLElement | undefined
    sibling?.focus()
  }

  return (
    <section className={styles.section} data-hub-bezirke="">
      <div className={styles.inner}>
        <p className={styles.kicker}>{t('kicker')}</p>
        <h2 className={styles.heading}>{t('title')}</h2>
        <p className={styles.lead}>{t('lead')}</p>

        <div className={styles.tabs} role="tablist" aria-label={t('title')}>
          {districts.map((d, i) => (
            <button
              key={d.slug}
              type="button"
              role="tab"
              id={`bz-tab-${d.slug}`}
              aria-selected={i === active}
              aria-controls={`bz-panel-${d.slug}`}
              tabIndex={i === active ? 0 : -1}
              className={`${styles.tab} ${d.isFeature ? styles.feat : ''} ${i === active ? styles.active : ''}`}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {d.isFeature && <span className={styles.featBadge}>{t('featBadge')}</span>}
              {d.name}
            </button>
          ))}
        </div>

        {districts.map((d, i) => (
          <div
            key={d.slug}
            role="tabpanel"
            id={`bz-panel-${d.slug}`}
            aria-labelledby={`bz-tab-${d.slug}`}
            hidden={i !== active}
            className={styles.panel}
          >
            <h3 className={styles.panelName}>{d.name}</h3>
            {d.tagline && <p className={styles.panelTag}>{d.tagline}</p>}
            <div className={styles.grid}>
              {d.spots.map((s, n) => (
                <Link key={s.slug} href={`/restaurant/${s.slug}`} className={styles.tile}>
                  {i === active && s.image && (
                    <Image
                      src={s.image}
                      alt={normalizeName(s.name)}
                      fill
                      sizes="(max-width: 720px) 50vw, 260px"
                      className={styles.tileImg}
                    />
                  )}
                  <span className={styles.rank}>{String(n + 1).padStart(2, '0')}</span>
                  <div className={styles.tileBody}>
                    {s.category && <p className={styles.tileCat}>{s.category}</p>}
                    <h4 className={styles.tileName}>{normalizeName(s.name)}</h4>
                  </div>
                </Link>
              ))}
            </div>
            <div className={styles.foot}>
              <Link href={`/bezirk/${d.slug}`} className={styles.cta}>
                {t('cta', { name: d.name })}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Write the CSS module**

Overwrite `nextjs/app/components/HubBezirke.module.css` with:

```css
/* Always-dark statement band — stays ink even in light theme (no theme override). */
.section {
  background: #0a0a0a;
  color: #fbf8ee;
  border-top: 4px solid var(--brand-yellow, #ffd84a);
  border-bottom: 4px solid var(--brand-yellow, #ffd84a);
  padding: 46px 22px 50px;
}
.inner { max-width: 1120px; margin: 0 auto; }
.kicker {
  font-family: var(--font-ranchers);
  letter-spacing: .26em; text-transform: uppercase; font-size: 12px;
  color: var(--brand-yellow, #ffd84a); margin: 0 0 10px;
}
.heading {
  font-family: var(--font-ranchers);
  text-transform: uppercase; line-height: .94; letter-spacing: -.01em;
  font-size: clamp(40px, 11vw, 72px); margin: 0 0 6px; color: #fbf8ee;
}
.lead { font-size: 14px; color: #b8b1a4; margin: 0 0 24px; max-width: 52ch; line-height: 1.5; }

/* Tab strip — outline pills, horizontally scrollable on mobile. */
.tabs { display: flex; gap: 10px; overflow-x: auto; padding: 8px 2px 14px; margin: 0 -2px 4px; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab {
  position: relative; flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px;
  background: transparent; color: #fbf8ee; border: 1.6px solid #4a443b; border-radius: 11px;
  padding: 10px 16px 11px; cursor: pointer; font-family: var(--font-ranchers);
  text-transform: uppercase; font-size: 16px; line-height: 1; letter-spacing: .03em; white-space: nowrap;
  transition: transform .16s cubic-bezier(.34, 1.56, .64, 1), border-color .16s, background .16s, color .16s;
}
.tab:hover { border-color: #fbf8ee; transform: translateY(-2px); }
.tab.active { background: var(--brand-yellow, #ffd84a); border-color: var(--brand-yellow, #ffd84a); color: #0a0a0a; }
.feat { border-color: var(--c-coral, #ff5a4d); }
.feat.active { border-color: var(--brand-yellow, #ffd84a); }
.featBadge {
  position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
  font-size: 8px; letter-spacing: .14em; background: var(--c-coral, #ff5a4d); color: #fff;
  border-radius: 6px; padding: 3px 7px 2px; white-space: nowrap;
}

.panel { padding-top: 14px; }
.panel[hidden] { display: none; }
.panelName { font-family: var(--font-ranchers); text-transform: uppercase; font-size: clamp(28px, 7vw, 46px); line-height: 1; margin: 0 0 6px; color: #fbf8ee; }
.panelTag { font-size: 14px; color: #b8b1a4; line-height: 1.55; margin: 0 0 22px; max-width: 62ch; }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tile {
  position: relative; display: block; aspect-ratio: 4 / 5; overflow: hidden;
  background: #14100c; text-decoration: none; color: #fbf8ee; border-radius: 0;
  border: 1px solid rgba(251, 248, 238, .10);
}
.tileImg { object-fit: cover; transition: transform .5s cubic-bezier(.22, .9, .3, 1); }
.tile:hover .tileImg { transform: scale(1.06); }
.rank {
  position: absolute; top: 11px; left: 12px; font-family: var(--font-ranchers); font-size: 15px;
  color: var(--brand-yellow, #ffd84a); line-height: 1; text-shadow: 0 1px 6px rgba(0, 0, 0, .6); z-index: 1;
}
.tileBody {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 46px 13px 14px;
  background: linear-gradient(180deg, rgba(10, 8, 6, 0) 0%, rgba(10, 8, 6, .35) 42%, rgba(10, 8, 6, .9) 100%);
}
.tileCat { font-family: var(--font-ranchers); text-transform: uppercase; font-size: 11px; letter-spacing: .1em; margin: 0 0 3px; color: var(--brand-yellow, #ffd84a); }
.tileName { font-family: var(--font-ranchers); text-transform: uppercase; font-size: 16px; line-height: 1.08; margin: 0; color: #fbf8ee; }

.foot { margin-top: 24px; }
.cta {
  display: inline-block; font-family: var(--font-ranchers); text-transform: uppercase; letter-spacing: .1em;
  font-size: 13px; text-decoration: none; padding: 12px 18px; border-radius: 10px;
  background: var(--brand-yellow, #ffd84a); color: #0a0a0a;
}

/* Swap motion when a panel is un-hidden — translate only (brand rule: no opacity fades). */
@keyframes hubBzSwap { from { transform: translateX(20px); } to { transform: translateX(0); } }
.panel:not([hidden]) .panelName,
.panel:not([hidden]) .panelTag,
.panel:not([hidden]) .grid { animation: hubBzSwap .26s cubic-bezier(.22, .9, .3, 1); }
@media (prefers-reduced-motion: reduce) {
  .panel:not([hidden]) .panelName,
  .panel:not([hidden]) .panelTag,
  .panel:not([hidden]) .grid { animation: none; }
}

@media (min-width: 720px) {
  .section { padding: 56px max(22px, calc((100% - 1120px) / 2)) 64px; }
  .heading { font-size: clamp(56px, 7vw, 84px); }
  .grid { grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .tileName { font-size: 19px; }
}
```

- [ ] **Step 3: Commit**

```bash
cd nextjs && git add app/components/HubBezirke.tsx app/components/HubBezirke.module.css
git commit -m "feat: HubBezirke district switcher component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Component test — SEO-crawlable links for all districts

**Files:**
- Overwrite: `nextjs/app/components/HubBezirke.test.tsx`

- [ ] **Step 1: Write the failing test**

Overwrite `nextjs/app/components/HubBezirke.test.tsx` with:

```tsx
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { translations } from '@/lib/i18n/translations'
import HubBezirke from '@/app/components/HubBezirke'
import type { HubDistrict } from '@/lib/home/getHomeData'

const districts: HubDistrict[] = [
  {
    name: 'Neukölln', slug: 'neukoelln', tagline: 'Frische Welle', isFeature: true,
    spots: [{ name: 'Café Botanico', slug: 'cafe-botanico', image: 'https://cdn/x.jpg', category: 'Lunch' }],
  },
  {
    name: 'Kreuzberg', slug: 'kreuzberg', tagline: 'Döner-Ursprung', isFeature: false,
    spots: [{ name: 'ZOLA', slug: 'zola', image: 'https://cdn/y.jpg', category: 'Dinner' }],
  },
]

function render(d: HubDistrict[]) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de}>
      <HubBezirke districts={d} />
    </NextIntlClientProvider>,
  )
}

describe('HubBezirke', () => {
  it('renders a tab and the feature badge for the feature district', () => {
    const html = render(districts)
    expect(html).toContain('Neukölln')
    expect(html).toContain('Diese Woche')
    expect(html).toContain('Entdecke Berlin')
  })

  it('keeps every district CTA in the DOM (incl. the inactive panel) for crawlable links', () => {
    const html = render(districts)
    expect(html).toContain('href="/bezirk/neukoelln"')
    expect(html).toContain('href="/bezirk/kreuzberg"') // inactive panel still present
    expect(html).toContain('Alle Spots in Neukölln')
  })

  it('keeps every restaurant link in the DOM (incl. the inactive panel)', () => {
    const html = render(districts)
    expect(html).toContain('href="/restaurant/cafe-botanico"')
    expect(html).toContain('href="/restaurant/zola"') // inactive panel still present
  })

  it('hides the inactive panel via the hidden attribute', () => {
    const html = render(districts)
    expect(html).toContain('id="bz-panel-kreuzberg" hidden')
  })

  it('renders nothing when there are no districts', () => {
    expect(render([])).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd nextjs && npx vitest run app/components/HubBezirke.test.tsx`
Expected: PASS — 5 passed. (The component already exists from Task 3, so this test should pass immediately; if any assertion fails, fix the component, not the test.)

> Note on the `hidden` assertion: React serializes the boolean `hidden` prop as the bare attribute `hidden`. If the serializer emits attribute order differently, relax that single assertion to `expect(html).toContain('id="bz-panel-kreuzberg"')` plus `expect(html).toContain('hidden')` — but do not weaken the link assertions.

- [ ] **Step 3: Commit**

```bash
cd nextjs && git add app/components/HubBezirke.test.tsx
git commit -m "test: HubBezirke keeps all district + restaurant links in SSR HTML

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: i18n keys

**Files:**
- Modify: `nextjs/lib/i18n/translations.ts`

- [ ] **Step 1: Update the English (source) keys**

In `nextjs/lib/i18n/translations.ts`, inside `const en = {`'s `hub:` block, replace:

```ts
    bezirke: {
      title: "Berlin by district",
      sub: "Pick your neighbourhood",
    },
    bezirkOfWeek: {
      kicker: "District of the week",
      more: "More from {name} →",
    },
```

with:

```ts
    bezirke: {
      kicker: "Discover Berlin",
      title: "By district",
      lead: "Every neighbourhood cooks differently. Pick yours — we'll show you where to eat well.",
      featBadge: "★ This week",
      cta: "All spots in {name} →",
    },
```

- [ ] **Step 2: Update the German overrides**

In the same file, inside `const deOverrides`'s `hub:` block, replace:

```ts
    bezirke: {
      title: "Berlin nach Bezirken",
      sub: "Wähl dein Viertel",
    },
    bezirkOfWeek: {
      kicker: "Bezirk der Woche",
      more: "Mehr aus {name} →",
    },
```

with:

```ts
    bezirke: {
      kicker: "Entdecke Berlin",
      title: "Nach Bezirken",
      lead: "Jeder Kiez kocht anders. Wähl deinen Bezirk – wir zeigen dir, wo du dort wirklich gut isst.",
      featBadge: "★ Diese Woche",
      cta: "Alle Spots in {name} →",
    },
```

- [ ] **Step 3: Verify no stale references remain**

Run: `cd nextjs && grep -rn "bezirkOfWeek\|bezirke.sub\|hub.bezirke', 'sub" app/ lib/ --include="*.ts" --include="*.tsx" | grep -v "free-surface\|HubBezirkOfWeek"`
Expected: no matches (the only remaining `bezirkOfWeek` is the unrelated `bezirkOfWeekIdsQuery` in `lib/map/free-surface.ts`, which is excluded above and must stay).

- [ ] **Step 4: Commit**

```bash
cd nextjs && git add lib/i18n/translations.ts
git commit -m "feat: i18n keys for district switcher

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Wire into HubSection and delete the old component

**Files:**
- Modify: `nextjs/app/components/HubSection.tsx`
- Delete: `nextjs/app/components/HubBezirkOfWeek.tsx`, `nextjs/app/components/HubBezirkOfWeek.module.css`, `nextjs/app/components/HubBezirkOfWeek.test.tsx`

- [ ] **Step 1: Update HubSection**

In `nextjs/app/components/HubSection.tsx`, delete the import line:

```ts
import HubBezirkOfWeek from './HubBezirkOfWeek'
```

(Keep `import HubBezirke from './HubBezirke'`.)

Then replace these two lines:

```tsx
        <HubBezirkOfWeek bezirk={initialData.bezirkOfWeek} />
        <HubBezirke bezirke={initialData.bezirke} />
```

with this single line:

```tsx
        <HubBezirke districts={initialData.districts} />
```

- [ ] **Step 2: Delete the old component, its CSS and test**

```bash
cd nextjs && git rm app/components/HubBezirkOfWeek.tsx app/components/HubBezirkOfWeek.module.css app/components/HubBezirkOfWeek.test.tsx
```

- [ ] **Step 3: Type-check the whole app**

Run: `cd nextjs && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd nextjs && git add app/components/HubSection.tsx
git commit -m "feat: render district switcher in HubSection, drop HubBezirkOfWeek

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Full test suite

- [ ] **Step 1: Run the whole suite**

Run: `cd nextjs && npm test`
Expected: all tests pass. Confirm the new `assembleDistricts` and `HubBezirke` suites are included and green, and that no suite still imports `HubBezirkOfWeek`.

If anything fails, fix the underlying code (not the test) and re-run before continuing.

---

### Task 8: Production build verification

- [ ] **Step 1: Ensure no dev server is running**

(Per CLAUDE.md gotcha #5: `npm run build` while `npm run dev` is alive breaks `.next/`. Stop any dev server first.)

- [ ] **Step 2: Run the full build**

Run: `cd nextjs && npm run build`
Expected: build succeeds (this is the same step the pre-push hook runs). Watch for type errors and lint failures.

If the build fails with `UND_ERR_CONNECT_TIMEOUT` (Sanity CDN flake during static export), retry once.

- [ ] **Step 3: Final commit (if the build produced any tracked changes)**

Only if `git status` shows tracked changes you made (do not stage `.next/` or foreign files):

```bash
cd nextjs && git status
# stage only files you intentionally changed, then:
git commit -m "chore: district switcher build fixes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Manual verification (after implementation)

These are not automated — do them before opening the staging PR:

1. `npm run dev`, open `/` — the switcher renders as one dark band; feature district active with "★ Diese Woche".
2. Click several tabs — name, tagline and the 4 tiles swap with a slide (no fade); active tile images load.
3. View source / DevTools Elements — confirm `<a href="/bezirk/...">` and `<a href="/restaurant/...">` exist for **inactive** districts too (SEO).
4. Keyboard: Tab to the tablist, Arrow-Left/Right cycles tabs.
5. Toggle light theme — the block stays dark.
6. Mobile width — tab strip scrolls horizontally, tiles are 2×2.
7. EN locale (`/en`) — kicker/heading/CTA in English, taglines/categories in English where available.

## Integration

Once verified locally: PR `feat/home-bezirke-switcher` → `staging`, smoke on the staging URL, then PR `staging` → `main` (see CLAUDE.md staging workflow). Update memory `eat-this-bezirke-sticker-wall` to reflect the switcher replacing the sticker wall.
