// nextjs/lib/buddy/orchestrator.saved.test.ts
// `list_saved_spots` — Remys Zugriff auf die eigene Merkliste des Nutzers.
// Nur für angemeldete Konten: ohne Konto gibt es keine Merkliste, und ein
// Werkzeug, das immer leer antwortet, lädt nur zu Fragen ein, die niemand
// beantworten kann.
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

async function collect(gen: AsyncIterable<BuddyStreamEvent>): Promise<BuddyStreamEvent[]> {
  const out: BuddyStreamEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

const saved: SpotCandidate = {
  _id: 'r9',
  name: 'Bar Basta',
  slug: 'bar-basta',
  cuisineType: 'Bar',
  bezirk: 'Kreuzberg',
  shortDescription: null,
  tip: null,
  priceRange: '€€',
  mapsUrl: null,
  image: null,
  openNow: true,
  openLabel: 'Offen · bis 02:00',
  distanceLabel: null,
  categorySlugs: ['drinks'],
};

const deps = (listSavedSpots?: (locale: 'de' | 'en') => Promise<SpotCandidate[]>) => ({
  searchSpots: vi.fn(async () => []),
  searchArticles: vi.fn(async () => []),
  ...(listSavedSpots ? { listSavedSpots } : {}),
});

describe('list_saved_spots', () => {
  it('streams the account’s hearted spots and hands them back to the model', async () => {
    const turns = [
      turnOf(['Schau mal… '], [{ id: 't1', name: 'list_saved_spots', input: {} }]),
      turnOf(['Bar Basta hat noch auf.\n[[spot:bar-basta]]']),
    ];
    let i = 0;
    const llm: LlmClient = { runTurn: () => turns[i++] };
    const listSavedSpots = vi.fn(async () => [saved]);

    const events = await collect(
      runBuddyTurn(
        {
          messages: [{ role: 'user', content: 'Was von meiner Map hat jetzt auf?' }],
          locale: 'de',
        },
        { llm, ...deps(listSavedSpots) }
      )
    );

    expect(listSavedSpots).toHaveBeenCalledWith('de');
    const spots = events.find((e) => e.type === 'spots');
    expect(spots).toBeDefined();
    const card = (spots as { value: SpotCandidate[] }).value[0];
    // Die Kategorie-Refs sind server-intern (Pack-Wahl) und dürfen den Client
    // so wenig erreichen wie bei search_spots.
    expect(card).not.toHaveProperty('categorySlugs');
    expect(card.name).toBe('Bar Basta');
    // Der Client braucht die Kennung fürs Herzen — das Modell nicht.
    expect(card._id).toBe('r9');
    // Kein Pack-Teaser auf die eigene Merkliste — das verkauft dem Nutzer
    // seine eigene Auswahl zurück.
    expect(events.some((e) => e.type === 'pack')).toBe(false);
  });

  it('is not offered at all without an account', async () => {
    const seen: unknown[] = [];
    const llm: LlmClient = {
      runTurn: ({ tools }) => {
        seen.push(tools.map((t) => t.name));
        return turnOf(['Ohne Konto keine Merkliste.']);
      },
    };

    await collect(
      runBuddyTurn(
        { messages: [{ role: 'user', content: 'meine map?' }], locale: 'de' },
        { llm, ...deps() }
      )
    );

    expect(seen[0]).toEqual(['search_spots', 'search_articles']);
  });

  it('offers the tool once an account is behind the request', async () => {
    const seen: string[][] = [];
    const llm: LlmClient = {
      runTurn: ({ tools }) => {
        seen.push(tools.map((t) => t.name));
        return turnOf(['Klar.']);
      },
    };

    await collect(
      runBuddyTurn(
        { messages: [{ role: 'user', content: 'meine map?' }], locale: 'de' },
        { llm, ...deps(async () => []) }
      )
    );

    expect(seen[0]).toContain('list_saved_spots');
  });
});
