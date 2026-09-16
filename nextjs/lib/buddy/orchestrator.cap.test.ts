// nextjs/lib/buddy/orchestrator.cap.test.ts
import { describe, it, expect } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { runBuddyTurn } from './orchestrator';
import type { LlmClient, LlmTurn } from './orchestrator';
import type { BuddyStreamEvent, SpotCandidate } from './types';

type ToolUses = NonNullable<LlmTurn['_toolUses']>;

function turnOf(toolUses: ToolUses = []): LlmTurn {
  return {
    async *text() {},
    async final() {
      return {
        stopReason: toolUses.length > 0 ? 'tool_use' : 'end_turn',
        assistantContent: toolUses.map((t) => ({
          type: 'tool_use',
          id: t.id,
          name: t.name,
          input: t.input,
        })),
        toolUses,
      };
    },
    _toolUses: toolUses,
  };
}

function searches(prefix: string, n: number): ToolUses {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    name: 'search_spots',
    input: { vibe_query: `bezirk ${i}` },
  }));
}

const spot: SpotCandidate = {
  _id: 'r1',
  name: 'Gazzo',
  slug: 'gazzo',
  cuisineType: 'Pizza',
  bezirk: 'Neukölln',
  shortDescription: null,
  tip: null,
  priceRange: '€€',
  mapsUrl: null,
  image: null,
  openNow: null,
  openLabel: null,
  distanceLabel: null,
};

/** Spielt die Runden ab und hält fest, was das Modell pro Aufruf zu sehen bekam. */
async function run(rounds: LlmTurn[], extra: Partial<Parameters<typeof runBuddyTurn>[1]> = {}) {
  const seen: Anthropic.MessageParam[][] = [];
  let i = 0;
  const llm: LlmClient = {
    runTurn: ({ messages }) => {
      // Tiefe Kopie: der Orchestrator hängt nach dem Aufruf weiter an dasselbe Array.
      seen.push(JSON.parse(JSON.stringify(messages)));
      return rounds[i++] ?? turnOf();
    },
  };
  let spotCalls = 0;
  const events: BuddyStreamEvent[] = [];
  for await (const e of runBuddyTurn(
    { messages: [{ role: 'user', content: 'Zeig mir Pizza in allen Bezirken' }], locale: 'de' },
    {
      llm,
      searchSpots: async () => {
        spotCalls++;
        return [spot];
      },
      searchArticles: async () => [],
      ...extra,
    }
  )) {
    events.push(e);
  }
  return { seen, spotCalls, events };
}

function toolResultsIn(messages: Anthropic.MessageParam[]): Anthropic.ToolResultBlockParam[] {
  const last = messages[messages.length - 1];
  return (last.content as Anthropic.ToolResultBlockParam[]).filter((b) => b.type === 'tool_result');
}

describe('Deckel für search_spots pro Runde', () => {
  it('führt von 20 parallelen Suchen nur drei aus — der Fall vom 08.09.2026', async () => {
    const { spotCalls, events } = await run([turnOf(searches('s', 20)), turnOf()]);

    expect(spotCalls).toBe(3);
    // Auch der Client bekommt nur drei Trefferlisten, keine Karten für Suchen, die nie liefen.
    expect(events.filter((e) => e.type === 'spots')).toHaveLength(3);
  });

  it('beantwortet trotzdem JEDEN tool_use, die überzähligen als Fehler', async () => {
    const { seen } = await run([turnOf(searches('s', 20)), turnOf()]);

    const results = toolResultsIn(seen[1]);
    expect(results.map((r) => r.tool_use_id)).toEqual(searches('s', 20).map((t) => t.id));

    const ok = results.filter((r) => !r.is_error);
    const refused = results.filter((r) => r.is_error);
    expect(ok.map((r) => r.tool_use_id)).toEqual(['s0', 's1', 's2']);
    expect(refused).toHaveLength(17);
    expect(String(refused[0].content)).toContain('höchstens 3 Suchen auf einmal');
  });

  it('zählt pro Runde neu: in der nächsten Runde darf das Modell wieder suchen', async () => {
    const { spotCalls, seen } = await run([
      turnOf(searches('a', 5)),
      turnOf(searches('b', 2)),
      turnOf(),
    ]);

    expect(spotCalls).toBe(3 + 2);
    expect(toolResultsIn(seen[2]).every((r) => !r.is_error)).toBe(true);
  });

  it('bremst nur die Spot-Suche: Artikel und Merkliste in derselben Runde laufen weiter', async () => {
    let articleCalls = 0;
    let savedCalls = 0;
    const { spotCalls, seen } = await run(
      [
        turnOf([
          ...searches('s', 3),
          { id: 'art', name: 'search_articles', input: { query: 'Pizza Berlin' } },
          { id: 'fav', name: 'list_saved_spots', input: {} },
        ]),
        turnOf(),
      ],
      {
        searchArticles: async () => {
          articleCalls++;
          return [];
        },
        listSavedSpots: async () => {
          savedCalls++;
          return [spot];
        },
      }
    );

    expect(spotCalls).toBe(3);
    expect(articleCalls).toBe(1);
    expect(savedCalls).toBe(1);
    expect(toolResultsIn(seen[1]).every((r) => !r.is_error)).toBe(true);
  });

  it('lässt eine normale Frage mit einer Suche unberührt', async () => {
    const { spotCalls, seen } = await run([turnOf(searches('s', 1)), turnOf()]);

    expect(spotCalls).toBe(1);
    expect(toolResultsIn(seen[1])).toHaveLength(1);
    expect(toolResultsIn(seen[1])[0].is_error).toBeUndefined();
  });
});
