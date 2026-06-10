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
      turnOf([''], [{ id: 'tu1', name: 'search_spots', input: { vibe_query: 'pizza' } }]),
      turnOf([''], [{ id: 'tu2', name: 'search_spots', input: { vibe_query: 'pizza nochmal' } }]),
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
    expect(packs[0]).toMatchObject({ value: { packId: 'category-pizza' } })
    // Intl puts a no-break space before € — normalize before comparing
    expect(packs[0].value.priceLabel.replace(/[  ]/g, ' ')).toBe('2,99 €')
    // streamed spots must not leak the internal category slugs
    const spotsEvents = events.filter(
      (e): e is Extract<BuddyStreamEvent, { type: 'spots' }> => e.type === 'spots',
    )
    expect(spotsEvents.length).toBe(2)
    for (const ev of spotsEvents) {
      for (const s of ev.value) expect('categorySlugs' in s).toBe(false)
    }
  })

  it('emits no pack teaser when results span categories', async () => {
    const mixed = (id: string, cat: string): SpotCandidate => ({
      _id: id, name: id, slug: id, cuisineType: null,
      bezirk: null, shortDescription: null, tip: null,
      priceRange: null, mapsUrl: null, image: null, openNow: null, openLabel: null, distanceLabel: null,
      categorySlugs: [cat],
    })
    const turns = [
      turnOf([''], [{ id: 'tu1', name: 'search_spots', input: { vibe_query: 'essen' } }]),
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
