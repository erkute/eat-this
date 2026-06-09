# Eat This KI-Buddy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein animiertes KI-Maskottchen als Floating-Widget auf eat-this, das geerdete Berliner Food-Empfehlungen (aus den eigenen Sanity-Daten) und Editorial-Talk liefert, mit lippensynchronem Avatar.

**Architecture:** Next.js Node-API-Route orchestriert Claude (Haiku 4.5) in einem Tool-Use-Loop. Zwei Tools (`search_spots`, `search_articles`) führen Standard-GROQ-Queries gegen Sanity aus und geben echte Kandidatensets zurück; Claude rankt nach Vibe und antwortet **nur** aus diesen Treffern. Die Antwort wird als NDJSON gestreamt (Text-Deltas + verifizierte Spot-Daten); das Frontend rendert den Text und Spot-Karten und treibt den Rive-Avatar (`isTalking`). Keine Vektor-DB (Sanity-Embeddings sind plan-gesperrt und bei 347 Docs unnötig).

**Tech Stack:** Next.js App Router (Node runtime), `@anthropic-ai/sdk` (bereits installiert, `ANTHROPIC_API_KEY` gesetzt), `@sanity/client` (Read-Client `@/lib/sanity`), firebase-admin (Firestore-Rate-Limit), Vitest, `@rive-app/react-canvas`, next-intl v4.

**Spec:** `docs/superpowers/specs/2026-06-08-eat-this-ki-buddy-design.md`

---

## File Structure

Alles unter `nextjs/`. Backend-Logik in `lib/buddy/` (eine Datei = eine Verantwortung, pure Funktionen separat von I/O), UI in `app/components/buddy/`.

| Datei | Verantwortung |
|---|---|
| `lib/buddy/types.ts` | Geteilte Typen (`Locale`, `SpotCandidate`, `ArticleResult`, `ChatMessage`, `BuddyStreamEvent`) |
| `lib/buddy/retrieval.ts` | GROQ-Query-Builder + `searchSpots` / `searchArticles` (I/O via injizierbarem Sanity-Client) |
| `lib/buddy/tools.ts` | Anthropic-Tool-Definitionen + Input-Typen |
| `lib/buddy/prompt.ts` | `buildSystemPrompt(locale)` — Persona + Anti-Halluzinations-Regeln |
| `lib/buddy/stream.ts` | NDJSON-Event-Encoding + `sanitizeLinks` (pure) |
| `lib/buddy/rateLimit.ts` | `evaluateRateLimit` (pure) + Firestore-Wrapper `checkRateLimit` |
| `lib/buddy/orchestrator.ts` | `runBuddyTurn` (Tool-Loop als Async-Generator) + `LlmClient`-Interface + Anthropic-Adapter |
| `app/api/buddy/route.ts` | Dünner HTTP-Adapter: Rate-Limit → Orchestrator → ReadableStream |
| `app/components/buddy/BuddyAvatar.tsx` | Rive-Avatar mit `isTalking`, CSS-Fallback |
| `app/components/buddy/useBuddyChat.ts` | Client-Hook: Streaming-Fetch + Parsing + Zustand |
| `app/components/buddy/BuddyWidget.tsx` | Floating-Bubble + Chat-Panel |
| `app/[locale]/(spa)/layout.tsx` | Mount-Point (modify) |

Tests liegen neben der Datei (`*.test.ts` / `*.test.tsx`) gemäß bestehendem Muster.

**Kanonische Namen (über alle Tasks konsistent):** `Locale`, `SpotCandidate`, `ArticleResult`, `ChatMessage`, `BuddyStreamEvent`, `SpotFilters`, `buildSpotsQuery`, `buildSpotsParams`, `searchSpots`, `searchArticles`, `BUDDY_TOOLS`, `buildSystemPrompt`, `encodeBuddyEvent`, `sanitizeLinks`, `evaluateRateLimit`, `checkRateLimit`, `runBuddyTurn`, `LlmClient`, `createAnthropicLlmClient`.

---

## Task 1: Shared types

**Files:**
- Create: `nextjs/lib/buddy/types.ts`

- [ ] **Step 1: Write the types module**

```typescript
// nextjs/lib/buddy/types.ts
export type Locale = 'de' | 'en'

export interface SpotCandidate {
  name: string
  slug: string
  cuisineType: string | null
  bezirk: string | null
  shortDescription: string | null
  tip: string | null
  priceRange: string | null
  mapsUrl: string | null
}

export interface ArticleResult {
  title: string
  slug: string
  excerpt: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export type BuddyStreamEvent =
  | { type: 'text'; value: string }
  | { type: 'spots'; value: SpotCandidate[] }
  | { type: 'error'; value: string }
  | { type: 'done' }
```

- [ ] **Step 2: Typecheck**

Run: `cd nextjs && npx tsc --noEmit`
Expected: PASS (no errors referencing `lib/buddy/types.ts`).

- [ ] **Step 3: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add nextjs/lib/buddy/types.ts
git commit -m "feat(buddy): shared types for KI-Buddy"
```

---

## Task 2: Retrieval — query builder (pure)

The pure query/param builders are unit-tested without touching Sanity. `searchSpots`/`searchArticles` (Task 3) wrap them with an injectable client.

**Files:**
- Create: `nextjs/lib/buddy/retrieval.ts`
- Test: `nextjs/lib/buddy/retrieval.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// nextjs/lib/buddy/retrieval.test.ts
import { describe, it, expect } from 'vitest'
import { buildSpotsQuery, buildSpotsParams } from './retrieval'

describe('buildSpotsQuery', () => {
  it('inlines a clamped limit and selects the projection fields', () => {
    const q = buildSpotsQuery(30)
    expect(q).toContain('[0...30]')
    expect(q).toContain('_type == "restaurant"')
    expect(q).toContain('isOpen == true && isClosed != true && tierAnon == true')
    expect(q).toContain('"slug": slug.current')
    expect(q).toContain('"bezirk": bezirkRef->name')
    expect(q).toContain('order(featured desc, lastReviewed desc)')
  })

  it('clamps the limit to the 1..40 range', () => {
    expect(buildSpotsQuery(999)).toContain('[0...40]')
    expect(buildSpotsQuery(0)).toContain('[0...1]')
  })
})

describe('buildSpotsParams', () => {
  it('returns null for absent filters and wildcards present filters', () => {
    const p = buildSpotsParams({ cuisine: 'Pizza', vibeQuery: 'gemütlich' }, 'de')
    expect(p.cuisine).toBe('*Pizza*')
    expect(p.bezirk).toBeNull()
    expect(p.price).toBeNull()
    expect(p.locale).toBe('de')
  })

  it('trims and wildcards bezirk and passes price exactly', () => {
    const p = buildSpotsParams(
      { bezirk: ' Schöneberg ', priceRange: '€€', vibeQuery: 'x' },
      'en',
    )
    expect(p.bezirk).toBe('*Schöneberg*')
    expect(p.price).toBe('€€')
    expect(p.locale).toBe('en')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nextjs && npx vitest run lib/buddy/retrieval.test.ts`
Expected: FAIL — `buildSpotsQuery`/`buildSpotsParams` not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// nextjs/lib/buddy/retrieval.ts
import { client as sanityClient } from '@/lib/sanity'
import type { Locale, SpotCandidate, ArticleResult } from './types'

export interface SpotFilters {
  cuisine?: string
  bezirk?: string
  priceRange?: string
  vibeQuery: string
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.trunc(Number.isFinite(n) ? n : lo)))

const SPOTS_PROJECTION = `{
  name,
  "slug": slug.current,
  cuisineType,
  "bezirk": bezirkRef->name,
  "shortDescription": select($locale == "en" => coalesce(shortDescriptionEn, shortDescription), shortDescription),
  "tip": select($locale == "en" => coalesce(tipEn, tip), tip),
  priceRange,
  mapsUrl
}`

export function buildSpotsQuery(limit: number): string {
  const n = clamp(limit, 1, 40)
  return `*[
    _type == "restaurant"
    && isOpen == true && isClosed != true && tierAnon == true
    && (!defined($cuisine) || cuisineType match $cuisine)
    && (!defined($bezirk) || bezirkRef->name match $bezirk)
    && (!defined($price) || priceRange == $price)
    && defined(slug.current)
  ] | order(featured desc, lastReviewed desc) [0...${n}] ${SPOTS_PROJECTION}`
}

const wildcard = (s?: string) => {
  const t = (s ?? '').trim()
  return t.length > 0 ? `*${t}*` : null
}

export function buildSpotsParams(filters: SpotFilters, locale: Locale) {
  return {
    cuisine: wildcard(filters.cuisine),
    bezirk: wildcard(filters.bezirk),
    price: (filters.priceRange ?? '').trim() || null,
    locale,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd nextjs && npx vitest run lib/buddy/retrieval.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add nextjs/lib/buddy/retrieval.ts nextjs/lib/buddy/retrieval.test.ts
git commit -m "feat(buddy): GROQ spots query + params builder"
```

---

## Task 3: Retrieval — searchSpots / searchArticles (injected client)

**Files:**
- Modify: `nextjs/lib/buddy/retrieval.ts`
- Test: `nextjs/lib/buddy/retrieval.test.ts` (append)

- [ ] **Step 1: Write the failing test (append to retrieval.test.ts)**

```typescript
// append to nextjs/lib/buddy/retrieval.test.ts
import { searchSpots, searchArticles } from './retrieval'
import type { SpotCandidate, ArticleResult } from './types'

describe('searchSpots', () => {
  it('passes the built query+params to the client and returns results', async () => {
    const calls: Array<{ query: string; params: unknown }> = []
    const fakeSpot: SpotCandidate = {
      name: 'Standard Serif', slug: 'standard-serif', cuisineType: 'Pizza',
      bezirk: 'Mitte', shortDescription: 'Neapolitan', tip: null,
      priceRange: '€€', mapsUrl: 'https://maps.example/x',
    }
    const fakeClient = {
      fetch: async (query: string, params: unknown) => {
        calls.push({ query, params })
        return [fakeSpot]
      },
    }
    const out = await searchSpots(
      { cuisine: 'Pizza', bezirk: 'Mitte', vibeQuery: 'gut' },
      'de',
      { client: fakeClient },
    )
    expect(out).toEqual([fakeSpot])
    expect(calls).toHaveLength(1)
    expect(calls[0].query).toContain('_type == "restaurant"')
    expect(calls[0].params).toMatchObject({ cuisine: '*Pizza*', bezirk: '*Mitte*', locale: 'de' })
  })
})

describe('searchArticles', () => {
  it('queries newsArticle with the wildcarded term and returns results', async () => {
    const calls: Array<{ query: string; params: unknown }> = []
    const fakeArticle: ArticleResult = { title: 'Kaffee in Berlin', slug: 'kaffee', excerpt: 'Third wave' }
    const fakeClient = {
      fetch: async (query: string, params: unknown) => {
        calls.push({ query, params })
        return [fakeArticle]
      },
    }
    const out = await searchArticles({ query: 'Kaffee' }, 'de', { client: fakeClient })
    expect(out).toEqual([fakeArticle])
    expect(calls[0].query).toContain('_type == "newsArticle"')
    expect(calls[0].params).toMatchObject({ q: '*Kaffee*', locale: 'de' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nextjs && npx vitest run lib/buddy/retrieval.test.ts`
Expected: FAIL — `searchSpots`/`searchArticles` not exported.

- [ ] **Step 3: Write minimal implementation (append to retrieval.ts)**

```typescript
// append to nextjs/lib/buddy/retrieval.ts

interface SanityLike {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>
}
interface RetrievalDeps {
  client?: SanityLike
}

const SPOTS_LIMIT = 30

export async function searchSpots(
  filters: SpotFilters,
  locale: Locale,
  deps: RetrievalDeps = {},
): Promise<SpotCandidate[]> {
  const client = deps.client ?? (sanityClient as unknown as SanityLike)
  const query = buildSpotsQuery(SPOTS_LIMIT)
  const params = buildSpotsParams(filters, locale)
  const rows = await client.fetch<SpotCandidate[]>(query, params)
  return rows ?? []
}

export interface ArticleQuery {
  query: string
}

const ARTICLES_QUERY = `*[
  _type == "newsArticle"
  && defined(slug.current)
  && (coalesce(titleDe, title) match $q || coalesce(excerptDe, excerpt) match $q || pt::text(content) match $q)
] | order(date desc) [0...5] {
  "title": select($locale == "en" => coalesce(title, titleDe), coalesce(titleDe, title)),
  "slug": slug.current,
  "excerpt": select($locale == "en" => coalesce(excerpt, excerptDe), coalesce(excerptDe, excerpt))
}`

export async function searchArticles(
  input: ArticleQuery,
  locale: Locale,
  deps: RetrievalDeps = {},
): Promise<ArticleResult[]> {
  const client = deps.client ?? (sanityClient as unknown as SanityLike)
  const term = input.query.trim()
  const q = term.length > 0 ? `*${term}*` : '*'
  const rows = await client.fetch<ArticleResult[]>(ARTICLES_QUERY, { q, locale })
  return rows ?? []
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd nextjs && npx vitest run lib/buddy/retrieval.test.ts`
Expected: PASS (6 tests total).

- [ ] **Step 5: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add nextjs/lib/buddy/retrieval.ts nextjs/lib/buddy/retrieval.test.ts
git commit -m "feat(buddy): searchSpots/searchArticles with injectable client"
```

---

## Task 4: Tool definitions

**Files:**
- Create: `nextjs/lib/buddy/tools.ts`
- Test: `nextjs/lib/buddy/tools.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// nextjs/lib/buddy/tools.test.ts
import { describe, it, expect } from 'vitest'
import { BUDDY_TOOLS } from './tools'

describe('BUDDY_TOOLS', () => {
  it('defines search_spots and search_articles', () => {
    const names = BUDDY_TOOLS.map((t) => t.name)
    expect(names).toEqual(['search_spots', 'search_articles'])
  })

  it('search_spots requires vibe_query and exposes optional filters', () => {
    const spots = BUDDY_TOOLS.find((t) => t.name === 'search_spots')!
    expect(spots.input_schema.required).toEqual(['vibe_query'])
    expect(Object.keys(spots.input_schema.properties)).toEqual(
      expect.arrayContaining(['cuisine', 'bezirk', 'price_range', 'vibe_query']),
    )
  })

  it('search_articles requires query', () => {
    const arts = BUDDY_TOOLS.find((t) => t.name === 'search_articles')!
    expect(arts.input_schema.required).toEqual(['query'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nextjs && npx vitest run lib/buddy/tools.test.ts`
Expected: FAIL — `BUDDY_TOOLS` not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// nextjs/lib/buddy/tools.ts
import type Anthropic from '@anthropic-ai/sdk'

export interface SearchSpotsInput {
  cuisine?: string
  bezirk?: string
  price_range?: string
  vibe_query: string
}
export interface SearchArticlesInput {
  query: string
}

export const BUDDY_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_spots',
    description:
      'Suche Restaurants/Cafés/Spots aus dem Eat-This-Bestand. Nutze dies, sobald der Nutzer nach einem Ort zum Essen/Trinken fragt. Setze cuisine/bezirk/price_range NUR, wenn der Nutzer sie explizit nennt. vibe_query immer mit Stimmung/Art der Anfrage füllen (z.B. "gemütlich, erstes Date" oder "schnelle Pizza").',
    input_schema: {
      type: 'object',
      properties: {
        cuisine: { type: 'string', description: 'Küche, z.B. "Pizza", "Ramen". Nur wenn genannt.' },
        bezirk: { type: 'string', description: 'Berliner Bezirk, z.B. "Schöneberg". Nur wenn genannt.' },
        price_range: { type: 'string', description: 'Preisklasse, z.B. "€", "€€", "€€€". Nur wenn genannt.' },
        vibe_query: { type: 'string', description: 'Stimmung/Art der Anfrage in eigenen Worten.' },
      },
      required: ['vibe_query'],
    },
  },
  {
    name: 'search_articles',
    description:
      'Suche Eat-This-Artikel für Wissens-/Editorial-Fragen über Berliner Food-Kultur (z.B. "Was macht Berliner Kaffee besonders?").',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Worum es inhaltlich geht.' },
      },
      required: ['query'],
    },
  },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd nextjs && npx vitest run lib/buddy/tools.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add nextjs/lib/buddy/tools.ts nextjs/lib/buddy/tools.test.ts
git commit -m "feat(buddy): Anthropic tool definitions"
```

---

## Task 5: System prompt

**Files:**
- Create: `nextjs/lib/buddy/prompt.ts`
- Test: `nextjs/lib/buddy/prompt.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// nextjs/lib/buddy/prompt.test.ts
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './prompt'

describe('buildSystemPrompt', () => {
  it('includes the anti-hallucination rule and tool guidance', () => {
    const p = buildSystemPrompt('de')
    expect(p).toMatch(/search_spots/)
    expect(p).toMatch(/erfinde? nie/i)
    expect(p).toMatch(/nur.*Tool-Ergebnis|ausschließlich.*Tool/i)
  })

  it('switches answer language by locale', () => {
    expect(buildSystemPrompt('de')).toMatch(/Antworte auf Deutsch/i)
    expect(buildSystemPrompt('en')).toMatch(/Answer in English/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nextjs && npx vitest run lib/buddy/prompt.test.ts`
Expected: FAIL — `buildSystemPrompt` not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// nextjs/lib/buddy/prompt.ts
import type { Locale } from './types'

export function buildSystemPrompt(locale: Locale): string {
  const lang =
    locale === 'en'
      ? 'Answer in English, in a warm, knowledgeable insider tone (informal "you").'
      : 'Antworte auf Deutsch, in einem warmen, kuratierten Insider-Ton (Du-Form, kein Slang).'

  return [
    'Du bist der Eat-This-Buddy — ein kenntnisreicher Berliner Food-Insider.',
    'Du hilfst Nutzern, gute Spots zum Essen und Trinken in Berlin zu finden, und plauderst über Berliner Food-Kultur.',
    '',
    '## Werkzeuge',
    '- Nutze `search_spots`, sobald jemand nach einem Restaurant/Café/Spot fragt.',
    '- Nutze `search_articles` für Wissens-/Editorial-Fragen über Berliner Food-Kultur.',
    '',
    '## Eiserne Regeln (nicht halluzinieren)',
    '- Empfiehl AUSSCHLIESSLICH Spots, die im Tool-Ergebnis stehen. Erfinde nie Namen, Adressen oder Öffnungszeiten.',
    '- Wenn das Tool keine passenden Treffer liefert, sag das ehrlich und lenke freundlich auf Berliner Spots zurück — erfinde nichts.',
    '- Allgemeine Food-Erklärungen (z.B. "Was ist Naturwein?") darfst du aus eigenem Wissen geben. Aber nenne dabei KEINE erfundenen konkreten Orte oder Fakten zu realen Orten.',
    '- Empfiehl pro Antwort höchstens 3–4 Spots. Wähle die zur Stimmung passendsten aus dem Kandidatenset.',
    '- Halte dich kurz und konkret. Nenne pro Spot einen knappen Grund (Küche/Vibe/Tipp).',
    '',
    lang,
  ].join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd nextjs && npx vitest run lib/buddy/prompt.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add nextjs/lib/buddy/prompt.ts nextjs/lib/buddy/prompt.test.ts
git commit -m "feat(buddy): system prompt builder"
```

---

## Task 6: Stream encoding + link sanitizer (pure)

**Files:**
- Create: `nextjs/lib/buddy/stream.ts`
- Test: `nextjs/lib/buddy/stream.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// nextjs/lib/buddy/stream.test.ts
import { describe, it, expect } from 'vitest'
import { encodeBuddyEvent, sanitizeLinks } from './stream'

describe('encodeBuddyEvent', () => {
  it('encodes one NDJSON line per event', () => {
    expect(encodeBuddyEvent({ type: 'text', value: 'hi' })).toBe('{"type":"text","value":"hi"}\n')
  })
})

describe('sanitizeLinks', () => {
  it('keeps markdown links whose slug is allowed and strips unknown ones to plain text', () => {
    const text =
      'Probier [Standard Serif](/de/restaurant/standard-serif) oder [Fake Spot](/de/restaurant/fake).'
    const out = sanitizeLinks(text, new Set(['standard-serif']))
    expect(out).toContain('[Standard Serif](/de/restaurant/standard-serif)')
    expect(out).toContain('Fake Spot')
    expect(out).not.toContain('/restaurant/fake')
  })

  it('leaves non-restaurant links untouched', () => {
    const text = 'Lies [den Artikel](/de/news/kaffee).'
    expect(sanitizeLinks(text, new Set())).toBe(text)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nextjs && npx vitest run lib/buddy/stream.test.ts`
Expected: FAIL — exports missing.

- [ ] **Step 3: Write minimal implementation**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd nextjs && npx vitest run lib/buddy/stream.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add nextjs/lib/buddy/stream.ts nextjs/lib/buddy/stream.test.ts
git commit -m "feat(buddy): NDJSON event encoding + link sanitizer"
```

---

## Task 7: Rate limit — window logic (pure) + Firestore wrapper

**Files:**
- Create: `nextjs/lib/buddy/rateLimit.ts`
- Test: `nextjs/lib/buddy/rateLimit.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// nextjs/lib/buddy/rateLimit.test.ts
import { describe, it, expect } from 'vitest'
import { evaluateRateLimit } from './rateLimit'

const LIMITS = { perMinute: 10, perDay: 100 }

describe('evaluateRateLimit', () => {
  it('allows and increments a fresh session', () => {
    const r = evaluateRateLimit(1_000_000, null, LIMITS)
    expect(r.allowed).toBe(true)
    expect(r.state.minuteCount).toBe(1)
    expect(r.state.dayCount).toBe(1)
  })

  it('resets the minute window after 60s', () => {
    const prev = { minuteStart: 0, minuteCount: 10, dayStart: 0, dayCount: 10 }
    const r = evaluateRateLimit(61_000, prev, LIMITS)
    expect(r.allowed).toBe(true)
    expect(r.state.minuteCount).toBe(1)
    expect(r.state.dayCount).toBe(11)
  })

  it('blocks when the minute limit is reached within the window', () => {
    const prev = { minuteStart: 0, minuteCount: 10, dayStart: 0, dayCount: 10 }
    const r = evaluateRateLimit(30_000, prev, LIMITS)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('per_minute')
  })

  it('blocks when the daily limit is reached even if the minute is fresh', () => {
    const prev = { minuteStart: 0, minuteCount: 0, dayStart: 0, dayCount: 100 }
    const r = evaluateRateLimit(120_000, prev, LIMITS)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('per_day')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nextjs && npx vitest run lib/buddy/rateLimit.test.ts`
Expected: FAIL — `evaluateRateLimit` not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// nextjs/lib/buddy/rateLimit.ts
import { getAdminFirestore } from '@/lib/firebase/admin'

export interface RateLimitState {
  minuteStart: number
  minuteCount: number
  dayStart: number
  dayCount: number
}
export interface RateLimits {
  perMinute: number
  perDay: number
}
export interface RateLimitDecision {
  allowed: boolean
  reason?: 'per_minute' | 'per_day'
  state: RateLimitState
}

const MINUTE = 60_000
const DAY = 86_400_000

export function evaluateRateLimit(
  now: number,
  prev: RateLimitState | null,
  limits: RateLimits,
): RateLimitDecision {
  const minuteFresh = !prev || now - prev.minuteStart >= MINUTE
  const dayFresh = !prev || now - prev.dayStart >= DAY

  const minuteStart = minuteFresh ? now : prev!.minuteStart
  const minuteCount = (minuteFresh ? 0 : prev!.minuteCount) + 1
  const dayStart = dayFresh ? now : prev!.dayStart
  const dayCount = (dayFresh ? 0 : prev!.dayCount) + 1

  const state: RateLimitState = { minuteStart, minuteCount, dayStart, dayCount }

  if (dayCount > limits.perDay) return { allowed: false, reason: 'per_day', state }
  if (minuteCount > limits.perMinute) return { allowed: false, reason: 'per_minute', state }
  return { allowed: true, state }
}

function limitsFromEnv(): RateLimits {
  return {
    perMinute: Number(process.env.BUDDY_RATE_LIMIT_PER_MIN ?? 10),
    perDay: Number(process.env.BUDDY_RATE_LIMIT_PER_DAY ?? 100),
  }
}

// Firestore-backed wrapper. One doc per session in collection `buddyRateLimits`.
// Uses a transaction so concurrent requests for the same session stay consistent.
export async function checkRateLimit(
  sessionId: string,
  now: number = Date.now(),
): Promise<RateLimitDecision> {
  const db = getAdminFirestore()
  const ref = db.collection('buddyRateLimits').doc(sessionId)
  const limits = limitsFromEnv()
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const prev = (snap.exists ? (snap.data() as RateLimitState) : null) ?? null
    const decision = evaluateRateLimit(now, prev, limits)
    tx.set(ref, decision.state)
    return decision
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd nextjs && npx vitest run lib/buddy/rateLimit.test.ts`
Expected: PASS (4 tests). (Only the pure `evaluateRateLimit` is tested; `checkRateLimit` is a thin Firestore wrapper exercised manually in Task 11.)

- [ ] **Step 5: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add nextjs/lib/buddy/rateLimit.ts nextjs/lib/buddy/rateLimit.test.ts
git commit -m "feat(buddy): rate limit window logic + Firestore wrapper"
```

---

## Task 8: Orchestrator — tool loop (async generator)

The orchestrator is the heart of the feature and the most valuable thing to test. It depends on a narrow `LlmClient` interface (not the SDK directly) so it can be driven by a scripted fake.

**Files:**
- Create: `nextjs/lib/buddy/orchestrator.ts`
- Test: `nextjs/lib/buddy/orchestrator.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// nextjs/lib/buddy/orchestrator.test.ts
import { describe, it, expect } from 'vitest'
import { runBuddyTurn } from './orchestrator'
import type { LlmClient, LlmTurn } from './orchestrator'
import type { BuddyStreamEvent, SpotCandidate } from './types'

function turnOf(texts: string[], toolUses: LlmTurn['_toolUses'] = []): LlmTurn {
  return {
    async *text() {
      for (const t of texts) yield t
    },
    async final() {
      return {
        stopReason: toolUses.length > 0 ? 'tool_use' : 'end_turn',
        assistantContent: [{ type: 'text', text: texts.join('') }],
        toolUses,
      }
    },
    _toolUses: toolUses,
  }
}

async function collect(gen: AsyncIterable<BuddyStreamEvent>): Promise<BuddyStreamEvent[]> {
  const out: BuddyStreamEvent[] = []
  for await (const e of gen) out.push(e)
  return out
}

describe('runBuddyTurn', () => {
  it('streams text, runs a spot search, streams spots, then the final answer', async () => {
    const spot: SpotCandidate = {
      name: 'Standard Serif', slug: 'standard-serif', cuisineType: 'Pizza',
      bezirk: 'Mitte', shortDescription: 'Neapolitan', tip: null,
      priceRange: '€€', mapsUrl: null,
    }
    const turns = [
      turnOf(['Lass mich schauen… '], [
        { id: 'tu1', name: 'search_spots', input: { vibe_query: 'pizza' } },
      ]),
      turnOf(['Ich empfehle Standard Serif.']),
    ]
    let i = 0
    const llm: LlmClient = { runTurn: () => turns[i++] }

    const events = await collect(
      runBuddyTurn(
        { messages: [{ role: 'user', content: 'pizza?' }], locale: 'de' },
        {
          llm,
          searchSpots: async () => [spot],
          searchArticles: async () => [],
        },
      ),
    )

    expect(events).toEqual([
      { type: 'text', value: 'Lass mich schauen… ' },
      { type: 'spots', value: [spot] },
      { type: 'text', value: 'Ich empfehle Standard Serif.' },
      { type: 'done' },
    ])
  })

  it('stops after MAX rounds without an infinite tool loop', async () => {
    const looping = turnOf(['…'], [{ id: 'x', name: 'search_spots', input: { vibe_query: 'a' } }])
    const llm: LlmClient = { runTurn: () => looping }
    const events = await collect(
      runBuddyTurn(
        { messages: [{ role: 'user', content: 'hi' }], locale: 'de' },
        { llm, searchSpots: async () => [], searchArticles: async () => [] },
      ),
    )
    expect(events.at(-1)).toEqual({ type: 'done' })
    // 'text' events == number of rounds, capped
    expect(events.filter((e) => e.type === 'text').length).toBeLessThanOrEqual(4)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nextjs && npx vitest run lib/buddy/orchestrator.test.ts`
Expected: FAIL — `runBuddyTurn` not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// nextjs/lib/buddy/orchestrator.ts
import Anthropic from '@anthropic-ai/sdk'
import type { Locale, ChatMessage, BuddyStreamEvent, SpotCandidate, ArticleResult } from './types'
import { BUDDY_TOOLS } from './tools'
import { buildSystemPrompt } from './prompt'
import type { SpotFilters, ArticleQuery } from './retrieval'

export interface LlmToolUse {
  id: string
  name: string
  input: Record<string, unknown>
}
export interface LlmTurn {
  text: () => AsyncIterable<string>
  final: () => Promise<{ stopReason: string; assistantContent: unknown; toolUses: LlmToolUse[] }>
  _toolUses?: LlmToolUse[]
}
export interface LlmClient {
  runTurn: (input: {
    system: Anthropic.TextBlockParam[]
    tools: Anthropic.Tool[]
    messages: Anthropic.MessageParam[]
  }) => LlmTurn
}

export interface OrchestratorDeps {
  llm: LlmClient
  searchSpots: (filters: SpotFilters, locale: Locale) => Promise<SpotCandidate[]>
  searchArticles: (input: ArticleQuery, locale: Locale) => Promise<ArticleResult[]>
}

const MAX_TOOL_ROUNDS = 4
const MAX_TOKENS = 2048
const MODEL = process.env.BUDDY_MODEL ?? 'claude-haiku-4-5'

export async function* runBuddyTurn(
  input: { messages: ChatMessage[]; locale: Locale },
  deps: OrchestratorDeps,
): AsyncGenerator<BuddyStreamEvent> {
  const system: Anthropic.TextBlockParam[] = [
    { type: 'text', text: buildSystemPrompt(input.locale), cache_control: { type: 'ephemeral' } },
  ]
  const messages: Anthropic.MessageParam[] = input.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const turn = deps.llm.runTurn({ system, tools: BUDDY_TOOLS, messages })

    for await (const chunk of turn.text()) {
      yield { type: 'text', value: chunk }
    }

    const final = await turn.final()
    messages.push({ role: 'assistant', content: final.assistantContent as Anthropic.ContentBlockParam[] })

    if (final.stopReason !== 'tool_use' || final.toolUses.length === 0) break

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const tu of final.toolUses) {
      if (tu.name === 'search_spots') {
        const spots = await deps.searchSpots(
          {
            cuisine: tu.input.cuisine as string | undefined,
            bezirk: tu.input.bezirk as string | undefined,
            priceRange: tu.input.price_range as string | undefined,
            vibeQuery: String(tu.input.vibe_query ?? ''),
          },
          input.locale,
        )
        yield { type: 'spots', value: spots }
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(spots) })
      } else if (tu.name === 'search_articles') {
        const articles = await deps.searchArticles(
          { query: String(tu.input.query ?? '') },
          input.locale,
        )
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(articles) })
      } else {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: 'Unbekanntes Werkzeug.',
          is_error: true,
        })
      }
    }
    messages.push({ role: 'user', content: toolResults })
  }

  yield { type: 'done' }
}

// Real LlmClient backed by the Anthropic SDK (not exercised in unit tests).
export function createAnthropicLlmClient(client: Anthropic = new Anthropic()): LlmClient {
  return {
    runTurn({ system, tools, messages }) {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        tools,
        messages,
      })
      return {
        async *text() {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              yield event.delta.text
            }
          }
        },
        async final() {
          const msg = await stream.finalMessage()
          const toolUses: LlmToolUse[] = msg.content
            .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
            .map((b) => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> }))
          return { stopReason: msg.stop_reason ?? 'end_turn', assistantContent: msg.content, toolUses }
        },
      }
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd nextjs && npx vitest run lib/buddy/orchestrator.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add nextjs/lib/buddy/orchestrator.ts nextjs/lib/buddy/orchestrator.test.ts
git commit -m "feat(buddy): tool-loop orchestrator + Anthropic adapter"
```

---

## Task 9: API route

Thin HTTP adapter: validate body → rate-limit → stream orchestrator events as NDJSON.

**Files:**
- Create: `nextjs/app/api/buddy/route.ts`
- Test: `nextjs/app/api/buddy/route.test.ts`

- [ ] **Step 1: Write the failing test**

The route delegates to `checkRateLimit`, `createAnthropicLlmClient`, `searchSpots`, `searchArticles`. We test the request validation + the rate-limit rejection path, mocking those modules.

```typescript
// nextjs/app/api/buddy/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/buddy/rateLimit', () => ({
  checkRateLimit: vi.fn(),
}))
vi.mock('@/lib/buddy/orchestrator', () => ({
  createAnthropicLlmClient: () => ({ runTurn: () => ({}) }),
  runBuddyTurn: async function* () {
    yield { type: 'text', value: 'hi' }
    yield { type: 'done' }
  },
}))
vi.mock('@/lib/buddy/retrieval', () => ({ searchSpots: vi.fn(), searchArticles: vi.fn() }))

import { POST } from './route'
import { checkRateLimit } from '@/lib/buddy/rateLimit'

function req(body: unknown): Request {
  return new Request('http://localhost/api/buddy', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/buddy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('400s on a missing sessionId', async () => {
    const res = await POST(req({ messages: [{ role: 'user', content: 'hi' }], locale: 'de' }))
    expect(res.status).toBe(400)
  })

  it('429s when rate limited', async () => {
    ;(checkRateLimit as any).mockResolvedValue({ allowed: false, reason: 'per_minute', state: {} })
    const res = await POST(
      req({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }], locale: 'de' }),
    )
    expect(res.status).toBe(429)
  })

  it('streams NDJSON when allowed', async () => {
    ;(checkRateLimit as any).mockResolvedValue({ allowed: true, state: {} })
    const res = await POST(
      req({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }], locale: 'de' }),
    )
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('"type":"text"')
    expect(text).toContain('"type":"done"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nextjs && npx vitest run app/api/buddy/route.test.ts`
Expected: FAIL — `route.ts` / `POST` not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// nextjs/app/api/buddy/route.ts
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/buddy/rateLimit'
import { createAnthropicLlmClient, runBuddyTurn } from '@/lib/buddy/orchestrator'
import { searchSpots, searchArticles } from '@/lib/buddy/retrieval'
import { encodeBuddyEvent } from '@/lib/buddy/stream'
import type { ChatMessage, Locale } from '@/lib/buddy/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_MESSAGES = 20
const MAX_CONTENT = 2000

function parseBody(body: unknown):
  | { ok: true; sessionId: string; messages: ChatMessage[]; locale: Locale }
  | { ok: false } {
  if (typeof body !== 'object' || body === null) return { ok: false }
  const b = body as Record<string, unknown>
  const sessionId = typeof b.sessionId === 'string' ? b.sessionId.trim() : ''
  if (!sessionId) return { ok: false }
  if (!Array.isArray(b.messages) || b.messages.length === 0) return { ok: false }
  const messages: ChatMessage[] = []
  for (const m of b.messages.slice(-MAX_MESSAGES)) {
    if (typeof m !== 'object' || m === null) return { ok: false }
    const role = (m as any).role
    const content = (m as any).content
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return { ok: false }
    messages.push({ role, content: content.slice(0, MAX_CONTENT) })
  }
  const locale: Locale = b.locale === 'en' ? 'en' : 'de'
  return { ok: true, sessionId, messages, locale }
}

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const parsed = parseBody(raw)
  if (!parsed.ok) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const limit = await checkRateLimit(parsed.sessionId)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limited', reason: limit.reason }, { status: 429 })
  }

  const llm = createAnthropicLlmClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runBuddyTurn(
          { messages: parsed.messages, locale: parsed.locale },
          { llm, searchSpots, searchArticles },
        )) {
          controller.enqueue(encoder.encode(encodeBuddyEvent(event)))
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(encodeBuddyEvent({ type: 'error', value: 'buddy_failed' })),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd nextjs && npx vitest run app/api/buddy/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add nextjs/app/api/buddy/route.ts nextjs/app/api/buddy/route.test.ts
git commit -m "feat(buddy): /api/buddy streaming route"
```

---

## Task 10: Avatar component (Rive + CSS fallback)

Builds the avatar so the whole widget works **before** the real `.riv` artwork exists. If `BuddyAvatar` can't load a Rive file, it renders an animated CSS mouth driven by `isTalking`. Swap-in instructions for the real artwork are in Task 13.

**Files:**
- Modify: `nextjs/package.json` (add dependency)
- Create: `nextjs/app/components/buddy/BuddyAvatar.tsx`
- Create: `nextjs/app/components/buddy/BuddyAvatar.module.css`
- Test: `nextjs/app/components/buddy/BuddyAvatar.test.tsx`

- [ ] **Step 1: Install the Rive dependency**

Run: `cd nextjs && npm install @rive-app/react-canvas`
Expected: package added to `dependencies`.

- [ ] **Step 2: Write the failing test**

```tsx
// nextjs/app/components/buddy/BuddyAvatar.test.tsx
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BuddyAvatarFallback } from './BuddyAvatar'

describe('BuddyAvatarFallback', () => {
  it('marks the mouth as talking when isTalking is true', () => {
    const html = renderToStaticMarkup(<BuddyAvatarFallback isTalking={true} />)
    expect(html).toMatch(/data-talking="true"/)
  })
  it('marks the mouth as idle when isTalking is false', () => {
    const html = renderToStaticMarkup(<BuddyAvatarFallback isTalking={false} />)
    expect(html).toMatch(/data-talking="false"/)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd nextjs && npx vitest run app/components/buddy/BuddyAvatar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the CSS and component**

```css
/* nextjs/app/components/buddy/BuddyAvatar.module.css */
.wrap { width: 56px; height: 56px; border-radius: 50%; overflow: hidden; }
.mouth { width: 40%; height: 8%; margin: 60% auto 0; background: #2a2a2a; border-radius: 999px;
  transform-origin: center; transition: transform 90ms ease; }
.mouth[data-talking='true'] { animation: flap 220ms steps(2, end) infinite; }
@keyframes flap { 0% { transform: scaleY(0.4) } 50% { transform: scaleY(1.6) } 100% { transform: scaleY(0.4) } }
```

```tsx
// nextjs/app/components/buddy/BuddyAvatar.tsx
'use client'
import { useEffect, useState } from 'react'
import styles from './BuddyAvatar.module.css'

export function BuddyAvatarFallback({ isTalking }: { isTalking: boolean }) {
  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={styles.mouth} data-talking={isTalking ? 'true' : 'false'} />
    </div>
  )
}

// Public component: tries Rive if a .riv asset is configured, else falls back.
// RIVE SWAP (Task 13): set NEXT_PUBLIC_BUDDY_RIVE_SRC to the published .riv URL.
export default function BuddyAvatar({ isTalking }: { isTalking: boolean }) {
  const src = process.env.NEXT_PUBLIC_BUDDY_RIVE_SRC
  const [Rive, setRive] = useState<null | typeof import('@rive-app/react-canvas')>(null)

  useEffect(() => {
    if (!src) return
    let active = true
    import('@rive-app/react-canvas').then((mod) => active && setRive(mod))
    return () => {
      active = false
    }
  }, [src])

  if (src && Rive) {
    return <RiveAvatar mod={Rive} src={src} isTalking={isTalking} />
  }
  return <BuddyAvatarFallback isTalking={isTalking} />
}

function RiveAvatar({
  mod,
  src,
  isTalking,
}: {
  mod: typeof import('@rive-app/react-canvas')
  src: string
  isTalking: boolean
}) {
  const { useRive, useStateMachineInput } = mod
  const STATE_MACHINE = 'Buddy'
  const { rive, RiveComponent } = useRive({ src, stateMachines: STATE_MACHINE, autoplay: true })
  const talking = useStateMachineInput(rive, STATE_MACHINE, 'isTalking')
  useEffect(() => {
    if (talking) talking.value = isTalking
  }, [talking, isTalking])
  return <RiveComponent style={{ width: 56, height: 56 }} />
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd nextjs && npx vitest run app/components/buddy/BuddyAvatar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add nextjs/package.json nextjs/package-lock.json nextjs/app/components/buddy/BuddyAvatar.tsx nextjs/app/components/buddy/BuddyAvatar.module.css nextjs/app/components/buddy/BuddyAvatar.test.tsx
git commit -m "feat(buddy): avatar component with Rive + CSS fallback"
```

---

## Task 11: Client chat hook (stream parsing)

**Files:**
- Create: `nextjs/app/components/buddy/useBuddyChat.ts`
- Test: `nextjs/app/components/buddy/useBuddyChat.test.ts`

- [ ] **Step 1: Write the failing test**

We extract the pure NDJSON line parser and test it directly (the React hook wraps it).

```typescript
// nextjs/app/components/buddy/useBuddyChat.test.ts
import { describe, it, expect } from 'vitest'
import { parseNdjsonLines } from './useBuddyChat'
import type { BuddyStreamEvent } from '@/lib/buddy/types'

describe('parseNdjsonLines', () => {
  it('parses complete lines and keeps the trailing partial in the remainder', () => {
    const events: BuddyStreamEvent[] = []
    const rest = parseNdjsonLines(
      '{"type":"text","value":"a"}\n{"type":"done"}\n{"type":"text","val',
      (e) => events.push(e),
    )
    expect(events).toEqual([{ type: 'text', value: 'a' }, { type: 'done' }])
    expect(rest).toBe('{"type":"text","val')
  })

  it('ignores empty lines', () => {
    const events: BuddyStreamEvent[] = []
    const rest = parseNdjsonLines('\n{"type":"done"}\n', (e) => events.push(e))
    expect(events).toEqual([{ type: 'done' }])
    expect(rest).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nextjs && npx vitest run app/components/buddy/useBuddyChat.test.ts`
Expected: FAIL — `parseNdjsonLines` not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// nextjs/app/components/buddy/useBuddyChat.ts
'use client'
import { useCallback, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import type { BuddyStreamEvent, ChatMessage, SpotCandidate, Locale } from '@/lib/buddy/types'
import { sanitizeLinks } from '@/lib/buddy/stream'

export function parseNdjsonLines(
  buffer: string,
  onEvent: (e: BuddyStreamEvent) => void,
): string {
  const parts = buffer.split('\n')
  const remainder = parts.pop() ?? ''
  for (const line of parts) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      onEvent(JSON.parse(trimmed) as BuddyStreamEvent)
    } catch {
      // ignore malformed line
    }
  }
  return remainder
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  const KEY = 'buddySessionId'
  let id = window.localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem(KEY, id)
  }
  return id
}

export interface BuddyDisplayMessage extends ChatMessage {
  spots?: SpotCandidate[]
}

export function useBuddyChat() {
  const locale = useLocale() as Locale
  const [messages, setMessages] = useState<BuddyDisplayMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const allowedSlugs = useRef<Set<string>>(new Set())

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      const history: BuddyDisplayMessage[] = [...messages, { role: 'user', content: trimmed }]
      setMessages([...history, { role: 'assistant', content: '' }])
      setIsStreaming(true)
      allowedSlugs.current = new Set()

      const updateAssistant = (mut: (m: BuddyDisplayMessage) => void) =>
        setMessages((prev) => {
          const next = [...prev]
          const last = { ...next[next.length - 1] }
          mut(last)
          next[next.length - 1] = last
          return next
        })

      try {
        const res = await fetch('/api/buddy', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: getSessionId(),
            locale,
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        })
        if (res.status === 429) {
          updateAssistant((m) => {
            m.content = locale === 'en'
              ? 'Easy 😅 give me a moment and ask again.'
              : 'Sachte 😅 gib mir kurz und frag gleich nochmal.'
          })
          return
        }
        if (!res.ok || !res.body) throw new Error('request_failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let raw = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          buffer = parseNdjsonLines(buffer, (e) => {
            if (e.type === 'text') {
              raw += e.value
              const safe = sanitizeLinks(raw, allowedSlugs.current)
              updateAssistant((m) => {
                m.content = safe
              })
            } else if (e.type === 'spots') {
              for (const s of e.value) allowedSlugs.current.add(s.slug)
              updateAssistant((m) => {
                m.spots = e.value
                m.content = sanitizeLinks(raw, allowedSlugs.current)
              })
            } else if (e.type === 'error') {
              updateAssistant((m) => {
                m.content = locale === 'en'
                  ? 'Sorry — something went wrong. Try again?'
                  : 'Sorry — da ist was schiefgelaufen. Nochmal?'
              })
            }
          })
        }
      } catch {
        updateAssistant((m) => {
          m.content = locale === 'en'
            ? 'Sorry — something went wrong. Try again?'
            : 'Sorry — da ist was schiefgelaufen. Nochmal?'
        })
      } finally {
        setIsStreaming(false)
      }
    },
    [messages, isStreaming, locale],
  )

  return { messages, isStreaming, send }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd nextjs && npx vitest run app/components/buddy/useBuddyChat.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add nextjs/app/components/buddy/useBuddyChat.ts nextjs/app/components/buddy/useBuddyChat.test.ts
git commit -m "feat(buddy): client chat hook with NDJSON stream parsing"
```

---

## Task 12: Widget UI + mount

**Files:**
- Create: `nextjs/app/components/buddy/BuddyWidget.tsx`
- Create: `nextjs/app/components/buddy/BuddyWidget.module.css`
- Test: `nextjs/app/components/buddy/BuddyWidget.test.tsx`
- Modify: `nextjs/app/[locale]/(spa)/layout.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// nextjs/app/components/buddy/BuddyWidget.test.tsx
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import BuddyWidget from './BuddyWidget'

describe('BuddyWidget', () => {
  it('renders a launcher button (closed by default)', () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="de" messages={{}}>
        <BuddyWidget />
      </NextIntlClientProvider>,
    )
    expect(html).toMatch(/data-buddy-launcher/)
    // panel is not open initially
    expect(html).not.toMatch(/data-buddy-panel="open"/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nextjs && npx vitest run app/components/buddy/BuddyWidget.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the CSS**

```css
/* nextjs/app/components/buddy/BuddyWidget.module.css */
.launcher { position: fixed; right: 20px; bottom: 20px; z-index: 60; border: none;
  background: transparent; cursor: pointer; padding: 0; }
.panel { position: fixed; right: 20px; bottom: 88px; z-index: 60; width: 360px; max-width: calc(100vw - 32px);
  height: 520px; max-height: calc(100vh - 120px); display: flex; flex-direction: column;
  background: #fff; border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.18); overflow: hidden; }
.header { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid #eee; }
.log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.msgUser { align-self: flex-end; background: #f0efe9; padding: 8px 12px; border-radius: 12px; max-width: 85%; white-space: pre-wrap; }
.msgBot { align-self: flex-start; max-width: 92%; white-space: pre-wrap; }
.spots { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
.spotCard { display: block; border: 1px solid #eee; border-radius: 10px; padding: 8px 10px; text-decoration: none; color: inherit; }
.form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #eee; }
.input { flex: 1; border: 1px solid #ddd; border-radius: 10px; padding: 8px 10px; font: inherit; }
.send { border: none; border-radius: 10px; padding: 8px 14px; cursor: pointer; }
```

- [ ] **Step 4: Write the component and mount it**

```tsx
// nextjs/app/components/buddy/BuddyWidget.tsx
'use client'
import { useState } from 'react'
import { useLocale } from 'next-intl'
import BuddyAvatar from './BuddyAvatar'
import { useBuddyChat } from './useBuddyChat'
import type { Locale, SpotCandidate } from '@/lib/buddy/types'
import styles from './BuddyWidget.module.css'

function SpotCard({ spot, locale }: { spot: SpotCandidate; locale: Locale }) {
  const href = `/${locale}/restaurant/${spot.slug}`
  return (
    <a className={styles.spotCard} href={href}>
      <strong>{spot.name}</strong>
      {spot.cuisineType ? ` · ${spot.cuisineType}` : ''}
      {spot.bezirk ? ` · ${spot.bezirk}` : ''}
    </a>
  )
}

export default function BuddyWidget() {
  const locale = useLocale() as Locale
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const { messages, isStreaming, send } = useBuddyChat()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft
    setDraft('')
    void send(text)
  }

  const placeholder = locale === 'en' ? 'Ask me about Berlin food…' : 'Frag mich über Berliner Food…'
  const title = locale === 'en' ? 'Eat This Buddy' : 'Eat This Buddy'

  return (
    <>
      <button
        className={styles.launcher}
        data-buddy-launcher
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
      >
        <BuddyAvatar isTalking={isStreaming && open} />
      </button>

      {open && (
        <div className={styles.panel} data-buddy-panel="open" role="dialog" aria-label={title}>
          <div className={styles.header}>
            <BuddyAvatar isTalking={isStreaming} />
            <strong>{title}</strong>
          </div>
          <div className={styles.log}>
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className={styles.msgUser}>{m.content}</div>
              ) : (
                <div key={i} className={styles.msgBot}>
                  {m.content}
                  {m.spots && m.spots.length > 0 && (
                    <div className={styles.spots}>
                      {m.spots.slice(0, 4).map((s) => (
                        <SpotCard key={s.slug} spot={s} locale={locale} />
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
          <form className={styles.form} onSubmit={onSubmit}>
            <input
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              disabled={isStreaming}
            />
            <button className={styles.send} type="submit" disabled={isStreaming || !draft.trim()}>
              →
            </button>
          </form>
        </div>
      )}
    </>
  )
}
```

Mount it in the SPA layout as a sibling to `<CookieConsent />` (it is a client component, safe to render from the server layout):

```tsx
// nextjs/app/[locale]/(spa)/layout.tsx
// 1) Add the import near the other component imports:
import BuddyWidget from '@/app/components/buddy/BuddyWidget'

// 2) Inside the provider tree, add <BuddyWidget /> right after <CookieConsent />:
//        <SearchOverlay />
//        <CookieConsent />
//        <BuddyWidget />        // <-- add this line
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd nextjs && npx vitest run app/components/buddy/BuddyWidget.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Run the full test + build**

Run: `cd nextjs && npx vitest run && npm run build`
Expected: all tests PASS; production build succeeds.

- [ ] **Step 7: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add nextjs/app/components/buddy/BuddyWidget.tsx nextjs/app/components/buddy/BuddyWidget.module.css nextjs/app/components/buddy/BuddyWidget.test.tsx "nextjs/app/[locale]/(spa)/layout.tsx"
git commit -m "feat(buddy): floating widget UI + SPA mount"
```

---

## Task 13: Config, docs & Rive swap-in (follow-up)

**Files:**
- Modify: `nextjs/apphosting.yaml` (env passthrough, if needed)
- Create: `docs/runbooks/2026-06-08-buddy-rive-avatar.md`

- [ ] **Step 1: Document the env knobs**

`ANTHROPIC_API_KEY` already exists. Add (optional) overrides to `apphosting.yaml` only if you want non-default values — the code falls back without them:
- `BUDDY_MODEL` (default `claude-haiku-4-5`; set to `claude-sonnet-4-6` to upgrade quality)
- `BUDDY_RATE_LIMIT_PER_MIN` (default `10`)
- `BUDDY_RATE_LIMIT_PER_DAY` (default `100`)
- `NEXT_PUBLIC_BUDDY_RIVE_SRC` (public URL of the published `.riv`; unset → CSS fallback avatar)

- [ ] **Step 2: Write the Rive swap-in runbook**

```markdown
# Buddy Rive Avatar — Swap-In

Until `NEXT_PUBLIC_BUDDY_RIVE_SRC` is set, `BuddyAvatar` renders an animated CSS-mouth fallback. To ship the real mascot:

1. Receive avatar artwork as separable layers (SVG/PNG), mouth as its own layer.
2. In the Rive editor, build a State Machine named exactly **`Buddy`** with:
   - A boolean input named exactly **`isTalking`**.
   - Idle animation (blink/sway) as the default state.
   - A talking state that flaps the mouth while `isTalking == true`.
3. Export/publish the `.riv`, host it (e.g. `nextjs/public/buddy/buddy.riv` or a CDN URL).
4. Set `NEXT_PUBLIC_BUDDY_RIVE_SRC` to that URL.
5. Verify: open the site, send a message, confirm the mouth animates during streaming.

The state-machine name (`Buddy`) and input name (`isTalking`) are hard-coded in `BuddyAvatar.tsx` — keep them in sync or update both.
```

- [ ] **Step 3: Manual verification checklist (no automated test)**

Run locally: `cd nextjs && npm run dev`, open `http://localhost:3000/de`:
- [ ] Launcher bubble appears bottom-right; click opens the panel.
- [ ] Ask „Ich hab Bock auf Pizza, was empfiehlst du?" → streamed answer + spot card(s) linking to `/de/restaurant/<slug>`.
- [ ] Ask „Ich bin in Schöneberg, brauch einen Kaffee-Spot." → spots filtered to the district.
- [ ] Ask „Was macht Berliner Kaffee besonders?" → editorial answer (may cite an article).
- [ ] Ask „bestes Sushi in München" → honest deflection, no invented spot.
- [ ] Switch to `/en` → answers come back in English.
- [ ] Spam the input → after the per-minute cap, a friendly throttle message appears (429).

- [ ] **Step 4: Commit**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This Neu"
git add docs/runbooks/2026-06-08-buddy-rive-avatar.md nextjs/apphosting.yaml
git commit -m "docs(buddy): env knobs + Rive avatar swap-in runbook"
```

---

## Self-Review Notes

**Spec coverage:**
- Hybrid retrieval (GROQ filter + Claude ranking) → Tasks 2, 3, 8 ✓
- Two-tool design → Tasks 4, 8 ✓
- Anti-hallucination (prompt + link=proof + client allowlist) → Tasks 5, 6, 8, 11 ✓
- Haiku 4.5 + caching + streaming → Task 8 (model, `cache_control`, streaming adapter) ✓
- Rate limiting (Firestore) → Task 7 ✓
- Floating widget + DE/EN + session-only history → Tasks 11, 12 ✓
- Rive avatar with `isTalking` + provide-artwork-later → Tasks 10, 13 ✓
- No GPS / no DB persistence / no embeddings → honored throughout ✓

**Type consistency:** `SpotCandidate`, `ArticleResult`, `ChatMessage`, `Locale`, `BuddyStreamEvent`, `SpotFilters`, `ArticleQuery` are defined once (Tasks 1–3) and reused verbatim in Tasks 8, 9, 11, 12. Tool input keys (`vibe_query`, `price_range`) map to `SpotFilters` (`vibeQuery`, `priceRange`) only inside the orchestrator (Task 8) — intentional boundary.

**Caching caveat:** With Haiku 4.5 the cacheable-prefix minimum is 4096 tokens; the system prompt + tools may be below that, so `cache_control` may not actually cache. It's harmless (no error) and becomes effective if the prompt grows. Documented, not a blocker.

**Slug-check realization:** Enforcement happens at the render layer via the `allowedSlugs` allowlist (client) + `sanitizeLinks` (shared), fed by the `spots` stream events — consistent with spec §5's intent (no hallucinated links reach the user).
