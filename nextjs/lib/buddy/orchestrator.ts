// nextjs/lib/buddy/orchestrator.ts
import Anthropic from '@anthropic-ai/sdk';
import type {
  Locale,
  ChatMessage,
  BuddyStreamEvent,
  SpotCandidate,
  ArticleResult,
  BuddyPageContext,
} from './types';
import { buddyTools } from './tools';
import { buildSystemPrompt } from './prompt';
import { pickPackForSpots, buildPackTeaser } from './packTeaser';
import type { PackDef } from '@/lib/stripe-catalog';
import { isNearbyIntent } from './nearbyIntent';
import type { SpotFilters, ArticleQuery } from './retrieval';

/** Der Besitz eines Kontos, wie ihn resolveEntitlements liefert. */
export interface OwnedPacks {
  /** Admin oder All-Berlin — dem Konto steht der ganze Katalog offen. */
  fullCatalog: boolean;
  categorySlugs: ReadonlySet<string>;
}

/**
 * Zwei Empfänger, zwei Zuschnitte.
 *
 * Der Client braucht `_id` (Herzen), `image` (Kartenfoto) und `mapsUrl`. Das
 * Modell braucht nichts davon — und bekam es trotzdem: bei einer breiten Frage
 * (30 Treffer) waren das 5.555 von 10.564 Token der Trefferliste, also gut die
 * Hälfte, davon 4.721 reine URLs. Ausgerechnet URLs, die der Prompt ihm im
 * selben Atemzug verbietet auszugeben.
 *
 * `categorySlugs` fällt für beide weg: die Kategorie-Refs entscheiden
 * server-intern über den Pack-Teaser.
 */
function forClient(spot: SpotCandidate): SpotCandidate {
  const lean = { ...spot };
  delete lean.categorySlugs;
  return lean;
}

function forModel(spot: SpotCandidate): Omit<SpotCandidate, '_id' | 'image' | 'mapsUrl'> {
  const { _id, image, mapsUrl, categorySlugs, ...rest } = spot;
  void _id;
  void image;
  void mapsUrl;
  void categorySlugs;
  return rest;
}

/**
 * Das Widget filterte bis zum 02.09.2026 selbst, über den Entitlement-Listener
 * — und der kennt den Admin-Zugang nicht (ADMIN_EMAILS plus verifizierte
 * Adresse, server-only, null Dokumente unter users/<uid>/entitlements). Remy
 * bot dem eigenen Admin-Konto darum Packs an, die ihm längst offenstanden.
 * Hier, wo das Token verifiziert ist, ist die Frage in einer Zeile beantwortet,
 * und eine Karte, die nie gesendet wird, muss der Client auch nicht verstecken.
 */
function ownsPack(owned: OwnedPacks | undefined, pack: PackDef): boolean {
  if (!owned) return false;
  if (owned.fullCatalog) return true;
  return pack.slug !== null && owned.categorySlugs.has(pack.slug);
}

interface LlmToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}
export interface LlmTurn {
  text: () => AsyncIterable<string>;
  final: () => Promise<{ stopReason: string; assistantContent: unknown; toolUses: LlmToolUse[] }>;
  _toolUses?: LlmToolUse[];
}
export interface LlmClient {
  runTurn: (input: {
    system: Anthropic.TextBlockParam[];
    tools: Anthropic.Tool[];
    messages: Anthropic.MessageParam[];
    signal?: AbortSignal;
  }) => LlmTurn;
}

interface OrchestratorDeps {
  llm: LlmClient;
  searchSpots: (filters: SpotFilters, locale: Locale) => Promise<SpotCandidate[]>;
  searchArticles: (input: ArticleQuery, locale: Locale) => Promise<ArticleResult[]>;
  /** Die geherzten Spots des angemeldeten Kontos. Fehlt für Gäste — dann
   *  bietet der Werkzeugkasten `list_saved_spots` gar nicht erst an. */
  listSavedSpots?: (locale: Locale) => Promise<SpotCandidate[]>;
}

const MAX_TOOL_ROUNDS = 4;
const MAX_TOKENS = 2048;
/* Seit 09.09.2026 Sonnet statt Haiku. Grund ist die Sprache, nicht das
   Denken: Haiku schrieb regelmäßig schiefes Deutsch („bestell du irgendetwas
   Verrücktes", „zwischen Massenmark und Milchschaum-Theater"), und auf einer
   Seite, deren Produkt die Stimme ist, ist das der teuerste Fehler. Gemessen
   kostet der Wechsel ~0,7 → ~1,4 Cent pro Antwort (siehe die Token-Messung im
   Commit zum Zuschnitt der Trefferliste). */
const MODEL = process.env.BUDDY_MODEL ?? 'claude-sonnet-5';

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Buddy request aborted', 'AbortError');
}

export async function* runBuddyTurn(
  input: {
    messages: ChatMessage[];
    locale: Locale;
    geo?: { lat: number; lng: number };
    page?: BuddyPageContext;
    /** Was dieses Konto schon hat — die Route leitet es aus dem verifizierten
     *  Token ab. Fehlt es, fragt ein Gast, und jedes Pack darf. */
    owned?: OwnedPacks;
  },
  deps: OrchestratorDeps,
  options: { signal?: AbortSignal } = {}
): AsyncGenerator<BuddyStreamEvent> {
  const system: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: buildSystemPrompt(input.locale, {
        hasGeo: !!input.geo,
        page: input.page,
        signedIn: !!deps.listSavedSpots,
      }),
      cache_control: { type: 'ephemeral' },
    },
  ];
  const messages: Anthropic.MessageParam[] = input.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const tools = buddyTools({ signedIn: !!deps.listSavedSpots });

  // At most ONE pack teaser per request — repeated cards would be exactly the
  // pushy selling the prompt forbids Remy himself.
  let packSent = false;
  const latestUserText =
    [...input.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const forceGeoSearch = !!input.geo && isNearbyIntent(latestUserText, { pageBound: !!input.page });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    throwIfAborted(options.signal);
    const turn = deps.llm.runTurn({ system, tools, messages, signal: options.signal });

    for await (const chunk of turn.text()) {
      throwIfAborted(options.signal);
      yield { type: 'text', value: chunk };
    }

    throwIfAborted(options.signal);
    const final = await turn.final();
    messages.push({
      role: 'assistant',
      content: final.assistantContent as Anthropic.ContentBlockParam[],
    });

    if (final.stopReason !== 'tool_use' || final.toolUses.length === 0) break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of final.toolUses) {
      throwIfAborted(options.signal);
      if (tu.name === 'search_spots') {
        const rawSpots = await deps.searchSpots(
          {
            cuisine: tu.input.cuisine as string | undefined,
            bezirk: forceGeoSearch ? undefined : (tu.input.bezirk as string | undefined),
            priceRange: tu.input.price_range as string | undefined,
            name: tu.input.name as string | undefined,
            userGeo: input.geo,
            vibeQuery: String(tu.input.vibe_query ?? ''),
          },
          input.locale
        );
        throwIfAborted(options.signal);
        const spots = rawSpots.map(forClient);
        yield { type: 'spots', value: spots };
        // Teaser only when the user explicitly named a dish/cuisine (the LLM
        // sets `cuisine` exactly then) AND that term or the results pin down
        // one pack category — a generic "wo kann man gut essen?" never gets a
        // card. The cuisine term anchors the pick: a breakfast question must
        // show the Breakfast pack even when the results' generic lunch/dinner
        // refs hold the majority.
        const explicitCuisine =
          typeof tu.input.cuisine === 'string' && tu.input.cuisine.trim().length > 0;
        if (!packSent && explicitCuisine) {
          const pack = pickPackForSpots(rawSpots, tu.input.cuisine as string);
          if (pack && !ownsPack(input.owned, pack)) {
            packSent = true;
            yield { type: 'pack', value: buildPackTeaser(pack, input.locale) };
          }
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(rawSpots.map(forModel)),
        });
      } else if (tu.name === 'list_saved_spots' && deps.listSavedSpots) {
        const saved = await deps.listSavedSpots(input.locale);
        throwIfAborted(options.signal);
        yield { type: 'spots', value: saved.map(forClient) };
        // Kein Pack-Teaser auf die eigene Merkliste: dort verkauft man dem
        // Nutzer seine eigene Auswahl zurück.
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(saved.map(forModel)),
        });
      } else if (tu.name === 'search_articles') {
        const articles = await deps.searchArticles(
          { query: String(tu.input.query ?? '') },
          input.locale
        );
        throwIfAborted(options.signal);
        yield { type: 'articles', value: articles };
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(articles),
        });
      } else {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: 'Unbekanntes Werkzeug.',
          is_error: true,
        });
      }
    }
    messages.push({ role: 'user', content: toolResults });
  }

  yield { type: 'done' };
}

// Real LlmClient backed by the Anthropic SDK (not exercised in unit tests).
export function createAnthropicLlmClient(client: Anthropic = new Anthropic()): LlmClient {
  return {
    runTurn({ system, tools, messages, signal }) {
      const stream = client.messages.stream(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          /* Ausdrücklich AUS. Auf Sonnet 5 heißt ein fehlendes `thinking`
             nicht „kein Denken" (wie auf Haiku 4.5), sondern adaptives Denken —
             das hätte zwei Dinge gebrochen, die hier zählen: die Denk-Token
             gehen von denselben 2048 ab und hätten lange Antworten abgeschnitten,
             und vor dem ersten sichtbaren Zeichen stünde eine Pause. Remy
             sucht und erzählt, er löst keine Rätsel. */
          thinking: { type: 'disabled' },
          system,
          tools,
          messages,
        },
        { signal }
      );
      return {
        async *text() {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              yield event.delta.text;
            }
          }
        },
        async final() {
          const msg = await stream.finalMessage();
          const toolUses: LlmToolUse[] = msg.content
            .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
            .map((b) => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> }));
          return {
            stopReason: msg.stop_reason ?? 'end_turn',
            assistantContent: msg.content,
            toolUses,
          };
        },
      };
    },
  };
}
