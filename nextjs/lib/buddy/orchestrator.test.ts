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
      priceRange: '€€', mapsUrl: null, image: null,
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
