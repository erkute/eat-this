// Thin Voyage AI embeddings client. Used both at build time (embedding the
// whole restaurant catalog, scripts/embed-restaurants.ts) and at request time
// (embedding the user's vibe query for semantic ranking). voyage-3-lite is
// multilingual (DE/EN) and 512-dimensional.

export const VOYAGE_MODEL = 'voyage-3-lite'
export const VOYAGE_DIM = 512

// Voyage accepts up to 1000 inputs per request, but the free tier WITHOUT a
// billing method on file is throttled to 3 requests/min and 10k tokens/min.
// Keep batches small and pace them well clear of both limits (see embedBatched).
// Adding a payment method on the Voyage dashboard lifts this; then MAX_BATCH and
// the pause can go back up.
const MAX_BATCH = 50

type VoyageInputType = 'document' | 'query'

interface VoyageResponse {
  data: { embedding: number[]; index: number }[]
  model: string
  usage: { total_tokens: number }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface EmbedOpts {
  apiKey?: string
  /** Retries on 429/5xx. 0 (default) = fail fast — right for request-time use
   *  where the caller falls back to keyword order rather than make Remy wait.
   *  Build-time embedding passes a few with a long backoff to ride out the
   *  free-tier per-minute window. */
  retries?: number
  backoffMs?: number
}

/** Embed up to MAX_BATCH texts in one request. */
export async function embed(
  texts: string[],
  inputType: VoyageInputType,
  opts: EmbedOpts = {},
): Promise<number[][]> {
  const { apiKey = process.env.VOYAGE_API_KEY, retries = 0, backoffMs = 30_000 } = opts
  if (!apiKey) throw new Error('VOYAGE_API_KEY not set')
  if (texts.length === 0) return []
  if (texts.length > MAX_BATCH) throw new Error(`embed() batch too large (${texts.length} > ${MAX_BATCH}); use embedBatched`)

  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: texts, model: VOYAGE_MODEL, input_type: inputType }),
    })
    if (res.ok) {
      const json = (await res.json()) as VoyageResponse
      // Voyage returns results in input order, but sort by index to be safe.
      return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
    }
    lastErr = new Error(`Voyage ${res.status}: ${(await res.text()).slice(0, 200)}`)
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      await sleep(backoffMs)
      continue
    }
    throw lastErr
  }
  throw lastErr
}

/** Embed an arbitrary number of texts, chunked into MAX_BATCH requests with a
 *  pause between them so the free-tier rate limit doesn't trip. Build-time use. */
export async function embedBatched(
  texts: string[],
  inputType: VoyageInputType,
  opts: { apiKey?: string; pauseMs?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<number[][]> {
  const { apiKey = process.env.VOYAGE_API_KEY, pauseMs = 25_000, onProgress } = opts
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    if (i > 0) await sleep(pauseMs)
    const chunk = texts.slice(i, i + MAX_BATCH)
    // Build-time: tolerate the free-tier per-minute window with long backoffs.
    out.push(...(await embed(chunk, inputType, { apiKey, retries: 4, backoffMs: 30_000 })))
    onProgress?.(Math.min(i + MAX_BATCH, texts.length), texts.length)
  }
  return out
}

/** Cosine similarity. Voyage vectors are not pre-normalized. */
export function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}
