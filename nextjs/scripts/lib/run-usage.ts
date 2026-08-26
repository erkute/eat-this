/**
 * Shared token/cost accounting for the content-generation scripts.
 *
 * Three scripts call a model per document over long unattended runs, and twice
 * a run stopped mid-way on an exhausted balance while the only cost figure
 * available was an estimate. Every script now reports what it actually spent,
 * so the next top-up is sized from a measurement.
 *
 * Prices are Anthropic list prices per million tokens. Cache reads bill at
 * 0.1x input, 5-minute cache writes at 1.25x, and web search is a flat fee per
 * search on top of tokens.
 */

export interface ModelPrices {
  /** USD per million input tokens. */
  input: number;
  /** USD per million output tokens. */
  output: number;
}

export const SONNET_5: ModelPrices = { input: 2, output: 10 };
export const SONNET_4_6: ModelPrices = { input: 3, output: 15 };

const WEB_SEARCH_PER_1000 = 10;
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

export interface Usage {
  in: number;
  cachedIn: number;
  cacheWrite: number;
  out: number;
  searches: number;
}

export function newUsage(): Usage {
  return { in: 0, cachedIn: 0, cacheWrite: 0, out: 0, searches: 0 };
}

/** Shape of the `usage` object the SDK returns on every message. */
export interface ApiUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number } | null;
}

export function recordUsage(u: Usage, api: ApiUsage): void {
  u.in += api.input_tokens ?? 0;
  u.out += api.output_tokens ?? 0;
  u.cachedIn += api.cache_read_input_tokens ?? 0;
  u.cacheWrite += api.cache_creation_input_tokens ?? 0;
  u.searches += api.server_tool_use?.web_search_requests ?? 0;
}

export function usdSpent(u: Usage, p: ModelPrices): number {
  return (
    (u.in * p.input) / 1e6 +
    (u.cachedIn * p.input * CACHE_READ_MULTIPLIER) / 1e6 +
    (u.cacheWrite * p.input * CACHE_WRITE_MULTIPLIER) / 1e6 +
    (u.out * p.output) / 1e6 +
    (u.searches * WEB_SEARCH_PER_1000) / 1000
  );
}

/** One-line spend report. `docsDone` drives the per-document figure that the
 *  next top-up is sized from; pass 0 to omit it. */
export function reportUsage(tag: string, u: Usage, p: ModelPrices, docsDone: number): void {
  const totalIn = u.in + u.cachedIn + u.cacheWrite;
  const k = (n: number) => Math.round(n / 1000);
  const cached = totalIn > 0 ? Math.round((u.cachedIn / totalIn) * 100) : 0;
  console.log(
    `[${tag}] Verbrauch: ` +
      (u.searches > 0 ? `${u.searches} Suchen · ` : '') +
      `${k(totalIn)}k Input (${cached}% aus dem Cache) · ${k(u.out)}k Output`
  );
  const total = usdSpent(u, p);
  console.log(
    `[${tag}] Kosten: $${total.toFixed(2)}` +
      (docsDone > 0 ? ` · $${(total / docsDone).toFixed(3)} pro Dokument` : '')
  );
}
