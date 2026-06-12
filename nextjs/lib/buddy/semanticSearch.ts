// Semantic ranking signal for the buddy. The restaurant catalog is embedded at
// build time (scripts/embed-restaurants.ts → restaurant-embeddings.json); at
// request time we embed the user's vibe query and cosine-rank the catalog.
//
// This is a *ranking signal layered over* the existing GROQ keyword search, not
// a replacement — searchSpots still filters; the semantic scores reorder. On any
// failure (no key, 429, missing index) it returns null and the caller falls back
// to keyword order unchanged.
import { embed, cosine } from './voyage'
import embeddings from './restaurant-embeddings.json'

interface EmbeddingsFile {
  model: string
  dim: number
  count: number
  vectors: Record<string, number[]>
}

const INDEX = embeddings as EmbeddingsFile

export interface SemanticScore {
  slug: string
  score: number
}

/** True when an embeddings index is present (build-time asset was generated). */
export function hasSemanticIndex(): boolean {
  return !!INDEX?.vectors && Object.keys(INDEX.vectors).length > 0
}

/**
 * Rank the catalog against a free-text query. Returns slug→score sorted desc,
 * or null when semantic search is unavailable (no key, no index, API error) so
 * the caller keeps the keyword ordering.
 */
export async function semanticRank(query: string): Promise<SemanticScore[] | null> {
  const q = query.trim()
  if (q.length < 3 || !hasSemanticIndex() || !process.env.VOYAGE_API_KEY) return null
  let qvec: number[]
  try {
    ;[qvec] = await embed([q], 'query')
  } catch {
    return null // 429 / network / key issue → caller falls back to keyword order
  }
  if (!qvec) return null
  const scores = Object.entries(INDEX.vectors).map(([slug, vec]) => ({
    slug,
    score: cosine(qvec, vec),
  }))
  scores.sort((a, b) => b.score - a.score)
  return scores
}

/**
 * Reorder candidate slugs by semantic score while keeping any not covered by
 * the index in their original relative order at the end. `semantic` is the
 * result of semanticRank (may be null → returns candidates unchanged).
 */
export function applySemanticOrder<T extends { slug?: string }>(
  candidates: T[],
  semantic: SemanticScore[] | null,
): T[] {
  if (!semantic) return candidates
  const rank = new Map(semantic.map((s, i) => [s.slug, i]))
  // Stable sort: items with a semantic rank come first (by rank); the rest keep
  // their original order behind them.
  return candidates
    .map((c, i) => ({ c, i, r: c.slug != null && rank.has(c.slug) ? rank.get(c.slug)! : Infinity }))
    .sort((a, b) => (a.r - b.r) || (a.i - b.i))
    .map((x) => x.c)
}
