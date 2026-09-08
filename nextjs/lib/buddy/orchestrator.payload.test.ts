// nextjs/lib/buddy/orchestrator.payload.test.ts
// Zwei Empfänger, zwei Zuschnitte. Bei einer breiten Frage (30 Treffer) waren
// `_id`, `image` und `mapsUrl` zusammen 5.555 von 10.564 Token der
// Trefferliste — gut die Hälfte, davon 4.721 reine URLs, die der Prompt im
// selben Atemzug auszugeben verbietet. Der Client braucht sie, das Modell nie.
import { describe, it, expect, vi } from 'vitest';
import { runBuddyTurn } from './orchestrator';
import type { LlmClient, LlmTurn } from './orchestrator';
import type { BuddyStreamEvent, SpotCandidate } from './types';

function turnOf(texts: string[], toolUses: LlmTurn['_toolUses'] = []): LlmTurn {
  return {
    async *text() {
      for (const t of texts) yield t;
    },
    async final() {
      return {
        stopReason: toolUses.length > 0 ? 'tool_use' : 'end_turn',
        assistantContent: [{ type: 'text', text: texts.join('') }],
        toolUses,
      };
    },
    _toolUses: toolUses,
  };
}

const spot: SpotCandidate = {
  _id: 'restaurant-zola',
  name: 'ZOLA',
  slug: 'zola',
  cuisineType: 'Italian',
  bezirk: 'Kreuzberg',
  shortDescription: 'Holzofen aus Neapel.',
  tip: 'Margherita.',
  priceRange: '10–20 €',
  mapsUrl: 'https://maps.google.com/?cid=123456789',
  image: 'https://cdn.sanity.io/images/ehwjnjr2/production/abc.jpg?w=640&q=82',
  openNow: true,
  openLabel: 'Offen · bis 23:00',
  distanceLabel: '600 m',
  categorySlugs: ['pizza'],
};

describe('Zuschnitt der Trefferliste', () => {
  it('gibt dem Client die Kennungen und dem Modell nur den Inhalt', async () => {
    const sent: string[] = [];
    const turns = [
      turnOf(['…'], [{ id: 't1', name: 'search_spots', input: { vibe_query: 'pizza' } }]),
      turnOf(['Fertig.']),
    ];
    let i = 0;
    const llm: LlmClient = {
      runTurn: ({ messages }) => {
        for (const m of messages) {
          if (Array.isArray(m.content)) {
            for (const b of m.content) {
              if (typeof b === 'object' && b && 'type' in b && b.type === 'tool_result') {
                sent.push(String((b as { content?: unknown }).content ?? ''));
              }
            }
          }
        }
        return turns[i++];
      },
    };

    const events: BuddyStreamEvent[] = [];
    for await (const e of runBuddyTurn(
      { messages: [{ role: 'user', content: 'pizza?' }], locale: 'de' },
      { llm, searchSpots: vi.fn(async () => [spot]), searchArticles: vi.fn(async () => []) }
    )) {
      events.push(e);
    }

    const card = (events.find((e) => e.type === 'spots') as { value: SpotCandidate[] }).value[0];
    expect(card._id).toBe('restaurant-zola');
    expect(card.image).toContain('cdn.sanity.io');
    expect(card.mapsUrl).toContain('maps.google.com');
    expect(card).not.toHaveProperty('categorySlugs');

    const toModel = JSON.parse(sent[0]) as Record<string, unknown>[];
    expect(toModel[0]).not.toHaveProperty('_id');
    expect(toModel[0]).not.toHaveProperty('image');
    expect(toModel[0]).not.toHaveProperty('mapsUrl');
    expect(toModel[0]).not.toHaveProperty('categorySlugs');
    // Was er zum Antworten braucht, bleibt vollständig.
    expect(toModel[0]).toMatchObject({
      name: 'ZOLA',
      slug: 'zola',
      bezirk: 'Kreuzberg',
      priceRange: '10–20 €',
      openLabel: 'Offen · bis 23:00',
      distanceLabel: '600 m',
      tip: 'Margherita.',
    });
    // Keine einzige URL mehr im Kontext.
    expect(sent[0]).not.toMatch(/https?:\/\//);
  });
});
