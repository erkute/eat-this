/**
 * Bettet die Magazin-Artikel mit Voyage ein und schreibt die Vektoren nach
 * lib/buddy/article-embeddings.json (eingecheckt als statisches Asset).
 *
 * Warum es das braucht: `search_articles` filterte bis zum 06.09.2026 mit
 * einem GROQ-`match` ueber `*<ganze Frage>*`. Das Werkzeug bekommt vom Modell
 * aber eine FORMULIERUNG („Was macht Berliner Kaffee besonders"), kein
 * Stichwort — und ein Wildcard-match darauf trifft nie. Gemessen: die Frage 0
 * Treffer, „kaffee" 3, „doener" 0 (die Artikel schreiben „Döner", `match` ist
 * diakritikablind). Das Werkzeug war fuer die Anfragen, die es bekommt, tot.
 *
 * Run from `nextjs/`:
 *   npm run embed:articles
 *
 * Required env (nextjs/.env.local): VOYAGE_API_KEY
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@sanity/client';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { embedBatched, VOYAGE_MODEL, VOYAGE_DIM } from '../lib/buddy/voyage';
import { ARTICLE_INDEX } from './lib/embeddings-index';

loadEnv({ path: '.env.local' });

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});

interface Row {
  slug: string;
  title?: string;
  excerpt?: string;
  body?: string;
}

const QUERY = `*[${ARTICLE_INDEX.filter}] | order(slug.current asc) {
  "slug": slug.current,
  "title": coalesce(titleDe, title),
  "excerpt": coalesce(excerptDe, excerpt),
  "body": pt::text(coalesce(contentDe, content))
}`;

/**
 * Wie viel Fliesstext mitgeht. Titel und Teaser tragen das Thema schon; der
 * Anfang des Textes ergaenzt den Einstieg. Mehr waere nicht besser, sondern
 * teurer: der Voyage-Free-Tier begrenzt 10k TOKEN pro Minute, und die 24
 * Artikel haben zusammen rund 40k Token Fliesstext.
 */
const BODY_CHARS = 1200;

function embeddingText(r: Row): string {
  const body = (r.body ?? '').slice(0, BODY_CHARS);
  return [r.title, r.excerpt, body].filter((p) => p && p.trim()).join('. ');
}

async function main() {
  if (!process.env.VOYAGE_API_KEY) {
    console.error('VOYAGE_API_KEY not set in nextjs/.env.local');
    process.exit(1);
  }
  console.log('Fetching articles from Sanity…');
  const rows = await client.fetch<Row[]>(QUERY);
  console.log(`  ${rows.length} articles`);
  const thin = rows.filter((r) => embeddingText(r).length < 80);
  if (thin.length > 0) {
    // Ein fast leerer Text gibt einen Vektor, der ueberall mittelmaessig passt
    // — schlimmer als kein Eintrag, weil er echte Treffer verdraengen kann.
    console.log(`  WARNUNG duenner Text: ${thin.map((r) => r.slug).join(', ')}`);
  }

  const texts = rows.map(embeddingText);
  console.log(`Embedding via Voyage (${VOYAGE_MODEL}, ${VOYAGE_DIM}-dim), batched…`);
  const vecs = await embedBatched(texts, 'document', {
    batchSize: 8,
    onProgress: (done, total) => console.log(`  ${done}/${total}`),
  });

  const vectors: Record<string, number[]> = {};
  rows.forEach((r, i) => {
    vectors[r.slug] = vecs[i].map((x) => Math.round(x * 1e6) / 1e6);
  });

  const out = { model: VOYAGE_MODEL, dim: VOYAGE_DIM, count: rows.length, vectors };
  const path = join(process.cwd(), ARTICLE_INDEX.path);
  writeFileSync(path, JSON.stringify(out));
  console.log(
    `Wrote ${path} (${rows.length} vectors, ~${Math.round(JSON.stringify(out).length / 1024)} KB)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
