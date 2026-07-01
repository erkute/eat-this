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
      _id: 'r1', name: 'Standard Serif', slug: 'standard-serif', cuisineType: 'Pizza',
      bezirk: 'Mitte', shortDescription: 'Neapolitan', tip: null,
      priceRange: '€€', mapsUrl: null, image: null, openNow: null, openLabel: null, distanceLabel: null,
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

  it('emits one pack teaser when results share a category, stripping categorySlugs', async () => {
    const pizzaSpot = (id: string): SpotCandidate => ({
      _id: id, name: id, slug: id, cuisineType: 'Pizza',
      bezirk: null, shortDescription: null, tip: null,
      priceRange: null, mapsUrl: null, image: null, openNow: null, openLabel: null, distanceLabel: null,
      categorySlugs: ['pizza'],
    })
    const turns = [
      turnOf([''], [{ id: 'tu1', name: 'search_spots', input: { cuisine: 'pizza', vibe_query: 'pizza' } }]),
      turnOf([''], [{ id: 'tu2', name: 'search_spots', input: { cuisine: 'pizza', vibe_query: 'pizza nochmal' } }]),
      turnOf(['Fertig.']),
    ]
    let i = 0
    const llm: LlmClient = { runTurn: () => turns[i++] }
    const events = await collect(
      runBuddyTurn(
        { messages: [{ role: 'user', content: 'pizza?' }], locale: 'de' },
        { llm, searchSpots: async () => [pizzaSpot('a'), pizzaSpot('b'), pizzaSpot('c')], searchArticles: async () => [] },
      ),
    )

    const packs = events.filter(
      (e): e is Extract<BuddyStreamEvent, { type: 'pack' }> => e.type === 'pack',
    )
    expect(packs).toHaveLength(1) // capped at one per request despite two searches
    expect(packs[0]).toMatchObject({ value: { packId: 'category-pizza', art: '/pics/booster/booster_pizza.webp' } })
    // teaser carries no price — the chat never names one
    expect('priceLabel' in packs[0].value).toBe(false)
    // streamed spots must not leak the internal category slugs
    const spotsEvents = events.filter(
      (e): e is Extract<BuddyStreamEvent, { type: 'spots' }> => e.type === 'spots',
    )
    expect(spotsEvents.length).toBe(2)
    for (const ev of spotsEvents) {
      for (const s of ev.value) expect('categorySlugs' in s).toBe(false)
    }
  })

  it('passes the cuisine as intent so the asked-for pack beats generic majority tags', async () => {
    // breakfast cafés also carry the near-universal lunch ref — the teaser
    // must follow the user's "frühstück", not the lunch majority
    const cafe = (id: string, cats: string[]): SpotCandidate => ({
      _id: id, name: id, slug: id, cuisineType: null,
      bezirk: null, shortDescription: null, tip: null,
      priceRange: null, mapsUrl: null, image: null, openNow: null, openLabel: null, distanceLabel: null,
      categorySlugs: cats,
    })
    const turns = [
      turnOf([''], [{ id: 'tu1', name: 'search_spots', input: { cuisine: 'frühstück', vibe_query: 'entspannt frühstücken' } }]),
      turnOf(['Fertig.']),
    ]
    let i = 0
    const llm: LlmClient = { runTurn: () => turns[i++] }
    const events = await collect(
      runBuddyTurn(
        { messages: [{ role: 'user', content: 'frühstück?' }], locale: 'de' },
        {
          llm,
          searchSpots: async () => [
            cafe('a', ['breakfast', 'lunch']),
            cafe('b', ['breakfast', 'lunch']),
            cafe('c', ['lunch', 'dinner']),
            cafe('d', ['lunch', 'dinner']),
          ],
          searchArticles: async () => [],
        },
      ),
    )
    const packs = events.filter(
      (e): e is Extract<BuddyStreamEvent, { type: 'pack' }> => e.type === 'pack',
    )
    expect(packs).toHaveLength(1)
    expect(packs[0].value.packId).toBe('category-breakfast')
  })

  it('emits no pack teaser without an explicit cuisine, even on uniform results', async () => {
    const pizzaSpot = (id: string): SpotCandidate => ({
      _id: id, name: id, slug: id, cuisineType: 'Pizza',
      bezirk: null, shortDescription: null, tip: null,
      priceRange: null, mapsUrl: null, image: null, openNow: null, openLabel: null, distanceLabel: null,
      categorySlugs: ['pizza'],
    })
    const turns = [
      // generic question — the LLM sets no `cuisine`
      turnOf([''], [{ id: 'tu1', name: 'search_spots', input: { vibe_query: 'wo gut essen?' } }]),
      turnOf(['Fertig.']),
    ]
    let i = 0
    const llm: LlmClient = { runTurn: () => turns[i++] }
    const events = await collect(
      runBuddyTurn(
        { messages: [{ role: 'user', content: 'wo kann man gut essen?' }], locale: 'de' },
        { llm, searchSpots: async () => [pizzaSpot('a'), pizzaSpot('b'), pizzaSpot('c')], searchArticles: async () => [] },
      ),
    )
    expect(events.filter((e) => e.type === 'pack')).toHaveLength(0)
  })

  it('emits no pack teaser when results span categories', async () => {
    const mixed = (id: string, cat: string): SpotCandidate => ({
      _id: id, name: id, slug: id, cuisineType: null,
      bezirk: null, shortDescription: null, tip: null,
      priceRange: null, mapsUrl: null, image: null, openNow: null, openLabel: null, distanceLabel: null,
      categorySlugs: [cat],
    })
    const turns = [
      // cuisine set, but the results don't agree on one category
      turnOf([''], [{ id: 'tu1', name: 'search_spots', input: { cuisine: 'essen', vibe_query: 'essen' } }]),
      turnOf(['Fertig.']),
    ]
    let i = 0
    const llm: LlmClient = { runTurn: () => turns[i++] }
    const events = await collect(
      runBuddyTurn(
        { messages: [{ role: 'user', content: 'essen?' }], locale: 'de' },
        {
          llm,
          searchSpots: async () => [mixed('a', 'pizza'), mixed('b', 'dinner'), mixed('c', 'coffee'), mixed('d', 'drinks')],
          searchArticles: async () => [],
        },
      ),
    )
    expect(events.filter((e) => e.type === 'pack')).toHaveLength(0)
  })

  it('ignores a model-provided bezirk for nearby searches when geo is present', async () => {
    const turns = [
      turnOf([''], [
        { id: 'tu1', name: 'search_spots', input: { cuisine: 'kaffee', bezirk: 'Mitte', vibe_query: 'guter kaffee in meiner nähe' } },
      ]),
      turnOf(['Fertig.']),
    ]
    let i = 0
    const llm: LlmClient = { runTurn: () => turns[i++] }
    let seenFilters: unknown = null

    await collect(
      runBuddyTurn(
        {
          messages: [{ role: 'user', content: 'Guter Kaffee in meiner Nähe?' }],
          locale: 'de',
          geo: { lat: 52.456, lng: 13.322 },
        },
        {
          llm,
          searchSpots: async (filters) => {
            seenFilters = filters
            return []
          },
          searchArticles: async () => [],
        },
      ),
    )

    expect(seenFilters).toMatchObject({
      cuisine: 'kaffee',
      bezirk: undefined,
      userGeo: { lat: 52.456, lng: 13.322 },
    })
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
