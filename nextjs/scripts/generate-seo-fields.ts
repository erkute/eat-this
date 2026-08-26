/**
 * Generates SEO meta fields (DE + EN) for restaurants and bezirke that lack them.
 * Reads name + description + descriptionEn (+ cuisine/district context for restaurants)
 * from Sanity, then asks Claude Sonnet 4.6 for compact, click-driver metaTitle /
 * metaDescription. Writes drafts only — publish-all-drafts.ts publishes after review.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/generate-seo-fields.ts --type restaurant --limit 3 --dry-run
 *   npx tsx scripts/generate-seo-fields.ts --type bezirk
 *   npx tsx scripts/generate-seo-fields.ts --type all
 *
 * Default --type is "restaurant" for backwards compat.
 *
 * Required env (in nextjs/.env.local):
 *   ANTHROPIC_API_KEY
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@sanity/client';
import Anthropic from '@anthropic-ai/sdk';
import { extractJsonObjectTextFromBlocks } from './lib/extract-json';

loadEnv({ path: '.env.local' });

import { newStats, noteFailure, reportFatal, finish } from './lib/api-failure';
import { newUsage, recordUsage, reportUsage, SONNET_5 } from './lib/run-usage';

const usage = newUsage();

const SANITY_PROJECT_ID = 'ehwjnjr2';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2024-01-01';
// Sonnet 5: newer and cheaper than 4.6 ($2/$10 vs $3/$15 per MTok). It thinks
// adaptively and thinking counts against max_tokens, so the budget below is
// doubled and effort stays low — the same treatment that took the description
// generator's truncation failures to zero.
const MODEL = 'claude-sonnet-5';

type DocType = 'restaurant' | 'bezirk';

interface CliOptions {
  type: DocType | 'all';
  limit: number | null;
  dryRun: boolean;
  draftsOnly: boolean;
  onlyWithPhoto: boolean;
  force: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    type: 'restaurant',
    limit: null,
    dryRun: false,
    draftsOnly: false,
    onlyWithPhoto: false,
    force: false,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--drafts-only') opts.draftsOnly = true;
    else if (arg === '--only-with-photo') opts.onlyWithPhoto = true;
    else if (arg === '--force') opts.force = true;
    else if (arg === '--limit') opts.limit = parseInt(args[++i] ?? '', 10);
    else if (arg === '--type') {
      const v = args[++i];
      if (v !== 'restaurant' && v !== 'bezirk' && v !== 'all') {
        throw new Error(`--type must be restaurant|bezirk|all, got "${v}"`);
      }
      opts.type = v;
    } else {
      throw new Error(`Unknown arg: ${arg}`);
    }
  }
  if (opts.limit !== null && (Number.isNaN(opts.limit) || opts.limit < 1)) {
    throw new Error(`--limit must be a positive integer`);
  }
  return opts;
}

// Lazy env reads — Next.js loads this module at build time and runtime
// secrets aren't available there. See generate-de-descriptions.ts for
// the full reasoning.
const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });

export interface RestaurantSource {
  _id: string;
  name: string;
  description?: string;
  descriptionEn?: string;
  shortDescription?: string;
  cuisineType?: string;
  district?: string;
  categories?: string[];
  priceRange?: { min?: number; max?: number; currency?: string };
  seo?: {
    metaTitle?: string;
    metaTitleEn?: string;
    metaDescription?: string;
    metaDescriptionEn?: string;
  };
}

function priceSymbolFromRange(pr?: { min?: number }): string | null {
  const min = pr?.min;
  if (min == null || Number.isNaN(min)) return null;
  if (min < 10) return '€';
  if (min < 25) return '€€';
  if (min < 50) return '€€€';
  return '€€€€';
}

interface BezirkSource {
  _id: string;
  name: string;
  description?: string;
  descriptionEn?: string;
  seo?: {
    metaTitle?: string;
    metaTitleEn?: string;
    metaDescription?: string;
    metaDescriptionEn?: string;
  };
}

// Project all fields with {...} wildcard. The script needs the full doc to clone
// into a draft via createIfNotExists; partial projections produced incomplete
// drafts (image, slug, openingHours …) — see feedback_sanity_draft_full_clone.md.
//
// Idempotent on BOTH published and draft state: a doc qualifies only if neither
// side has seo.metaTitle. Without the draft check, re-runs would regenerate
// every doc whose seo lives only in the draft.
async function fetchRestaurants(opts: {
  draftsOnly: boolean;
  force: boolean;
  onlyWithPhoto?: boolean;
}): Promise<RestaurantSource[]> {
  const seoClause = opts.force ? '' : ' && !defined(seo.metaTitle)';
  const onlyWithPhoto = opts.onlyWithPhoto ?? false;
  // A spot without an image can't be published — the publish gate in
  // lib/sanity-image-presets.ts closes and the detail page renders the empty
  // hero. Generating for it now is work on stock.
  const photoClause = onlyWithPhoto ? ' && defined(image.asset)' : '';
  if (opts.draftsOnly) {
    return sanity.fetch(
      `*[_type == "restaurant" && _id in path("drafts.**")${seoClause}${photoClause}]{...} | order(name asc)`
    );
  }
  if (opts.force) {
    return sanity.fetch(
      `*[_type == "restaurant" && !(_id in path("drafts.**"))]{...} | order(name asc)`
    );
  }
  return sanity.fetch(
    `*[_type == "restaurant" && !(_id in path("drafts.**"))
        && !defined(seo.metaTitle)
        && !defined(*[_id == "drafts." + ^._id][0].seo.metaTitle)]{...} | order(name asc)`
  );
}

async function fetchBezirke(opts: {
  draftsOnly: boolean;
  force: boolean;
}): Promise<BezirkSource[]> {
  const seoClause = opts.force ? '' : ' && !defined(seo.metaTitle)';
  if (opts.draftsOnly) {
    return sanity.fetch(
      `*[_type == "bezirk" && _id in path("drafts.**")${seoClause}]{...} | order(name asc)`
    );
  }
  if (opts.force) {
    return sanity.fetch(
      `*[_type == "bezirk" && !(_id in path("drafts.**"))]{...} | order(name asc)`
    );
  }
  return sanity.fetch(
    `*[_type == "bezirk" && !(_id in path("drafts.**"))
        && !defined(seo.metaTitle)
        && !defined(*[_id == "drafts." + ^._id][0].seo.metaTitle)]{...} | order(name asc)`
  );
}

const RESTAURANT_SEO_PROMPT = `Du schreibst Suchmaschinen-Meta-Felder für "Eat This Berlin", einen kuratierten Berliner Food-Guide.

Du bekommst Sanity-Fakten zu einem Restaurant: Name, Beschreibung (DE), englische Beschreibung (EN), Kategorien, Cuisine-Typ, Bezirk, Preisklasse.

ZIEL: vier kompakte Strings, die in Google-Snippets messbar besser klicken als der generische Fallback "<Name> — Eat This Berlin" + abgeschnittene description.

LÄNGEN-LIMITS (HART, dürfen nicht überschritten werden — Sanity-Validierung schlägt sonst zu):
- metaTitle (DE): max 60 Zeichen
- metaTitleEn (EN): max 60 Zeichen
- metaDescription (DE): max 160 Zeichen
- metaDescriptionEn (EN): max 160 Zeichen

REGELN:
- Restaurantnamen, Bezirksnamen, Dish-Eigennamen bleiben unverändert.
- Kein Werbe-Sprech ("entdecke", "must-try", "hidden gem", "Geheimtipp"), keine inhaltsleeren Superlative.
- Nur Fakten verwenden, die in den Quellen stehen. Keine Erfindungen.
- Rating-Zahlen nicht erwähnen (würden stale werden).
- Brand-Suffix " — Eat This Berlin" weglassen — der Browser hängt das nicht automatisch an, aber im Title ist Platz teurer als das Brand-Suffix; der Bezirks-Anchor klickt besser.

PATTERN-EMPFEHLUNG:
- metaTitle DE: "<Name> – <kompakter USP> in <Bezirk>"  (z.B. "893 Ryōtei – Sushi-Omakase in Charlottenburg")
- metaTitleEn: parallele EN-Variante  (z.B. "893 Ryōtei – Omakase Sushi in Charlottenburg")
- metaDescription DE: 140-160 Zeichen, ein klick-orientierter Satz mit USP + Bezirk + ein konkretes Detail aus der description
- metaDescriptionEn: parallel auf EN, aus descriptionEn destilliert (NICHT von DE übersetzt)

Falls descriptionEn fehlt, übersetze die DE-Essenz natürlich auf Englisch — kein wörtliches Übertragen.

Gib NUR ein JSON-Objekt zurück (kein Prosa, kein Markdown-Fence):
{
  "metaTitle": string,
  "metaTitleEn": string,
  "metaDescription": string,
  "metaDescriptionEn": string
}`;

const BEZIRK_SEO_PROMPT = `Du schreibst Suchmaschinen-Meta-Felder für "Eat This Berlin", einen kuratierten Berliner Food-Guide.

Du bekommst Sanity-Fakten zu einem Berliner Bezirk: Name, Beschreibung (DE), englische Beschreibung (EN). Anzahl Restaurants im Guide kann optional dabei sein.

ZIEL: vier kompakte Strings, die in Google-Snippets klicken sollen — User suchen typisch "Restaurants <Bezirk>" oder "Essen <Bezirk>". Der generische Fallback ist "Beste Restaurants in <Name> — Eat This Berlin", die Description fällt auf den ersten Satz der bezirk.description zurück.

LÄNGEN-LIMITS (HART, dürfen nicht überschritten werden — Sanity-Validierung schlägt sonst zu):
- metaTitle (DE): max 60 Zeichen
- metaTitleEn (EN): max 60 Zeichen
- metaDescription (DE): max 160 Zeichen
- metaDescriptionEn (EN): max 160 Zeichen

REGELN:
- Bezirksname bleibt unverändert (Eigenname).
- Kein Tourismus-Sprech ("entdecke", "lebendig", "bunt und multikulturell"), keine inhaltsleeren Superlative. Food-fokussiert, konkret.
- Nur Fakten verwenden, die in den Quellen stehen. Keine Erfindungen.
- Kein Brand-Suffix " — Eat This Berlin" — der Title-Platz ist teurer als das Branding.

PATTERN-EMPFEHLUNG:
- metaTitle DE: "Restaurants in <Bezirk> – <kulinarische USP>" oder "Essen in <Bezirk> – <USP>" (≤ 60)
- metaTitleEn: parallele EN-Variante
- metaDescription DE: 140-160 Zeichen, klick-orientiert: was den Bezirk kulinarisch ausmacht + Hinweis auf den Guide
- metaDescriptionEn: parallel auf EN, aus descriptionEn destilliert (NICHT von DE übersetzt)

Falls descriptionEn fehlt, übersetze die DE-Essenz natürlich auf Englisch.

Gib NUR ein JSON-Objekt zurück (kein Prosa, kein Markdown-Fence):
{
  "metaTitle": string,
  "metaTitleEn": string,
  "metaDescription": string,
  "metaDescriptionEn": string
}`;

export interface SeoGen {
  metaTitle: string;
  metaTitleEn: string;
  metaDescription: string;
  metaDescriptionEn: string;
}

function extractJsonText(content: Anthropic.ContentBlock[], docId: string): string {
  return extractJsonObjectTextFromBlocks(content, docId);
}

const LENGTH_LIMITS: Array<[keyof SeoGen, number]> = [
  ['metaTitle', 60],
  ['metaTitleEn', 60],
  ['metaDescription', 160],
  ['metaDescriptionEn', 160],
];

/** How much text a clean sentence ending may cost over a plain word cut. */
const SENTENCE_CUT_TOLERANCE = 25;

/** Last-resort deterministic trim. The model lands within a few characters of
 *  the limit but not reliably under it — 12 of 68 documents in one run
 *  overshot by 1 to 5 characters. Throwing those away costs a whole document
 *  plus the two API calls already spent on it, so cut instead: prefer the last
 *  sentence end that still keeps most of the text, otherwise the last word
 *  boundary, and drop trailing punctuation so the result ends cleanly. */
export function trimToLimit(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);

  // The word boundary is the baseline: it keeps as much as possible.
  const lastSpace = cut.lastIndexOf(' ');
  const byWord = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–—-]+$/u, '');

  // A sentence end reads better than a dangling fragment — but only take it
  // when it costs little. A one-character overshoot must never throw away half
  // a sentence, which a percentage-of-limit threshold would happily do.
  const lastSentence = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? ')
  );
  if (lastSentence > 0 && byWord.length - (lastSentence + 1) <= SENTENCE_CUT_TOLERANCE) {
    return cut.slice(0, lastSentence + 1);
  }
  return byWord;
}

function validateLengths(
  parsed: SeoGen,
  docId: string
): { ok: true } | { ok: false; offenders: string[] } {
  const offenders: string[] = [];
  for (const [key, max] of LENGTH_LIMITS) {
    const v = parsed[key];
    if (!v || typeof v !== 'string') {
      throw new Error(`${key} missing or not a string for ${docId}`);
    }
    if (v.length > max) {
      offenders.push(
        `${key} ist ${v.length} Zeichen, Limit ${max} (überschuss: ${v.length - max})`
      );
    }
  }
  return offenders.length === 0 ? { ok: true } : { ok: false, offenders };
}

async function generateSeoFromFacts(
  systemPrompt: string,
  facts: Record<string, unknown>,
  docId: string
): Promise<SeoGen> {
  const userMsg = `SANITY-FAKTEN:\n${JSON.stringify(facts, null, 2)}`;

  const callOnce = async (reminder: 'none' | 'json' | 'length', lengthOffenders: string[] = []) => {
    let content = userMsg;
    if (reminder === 'json') {
      content +=
        '\n\nWICHTIG: Antworte AUSSCHLIESSLICH mit gültigem JSON in der oben definierten Form. Keine Prosa, keine Erklärungen, keine Markdown-Codeblöcke. Halte die Längen-Limits ein.';
    } else if (reminder === 'length') {
      // Tell the model exactly which fields overshot and by how much. Avoid the
      // word "count" / "zählen" — Sonnet 4.6 takes it literally and replies with
      // prose ("I'll count…") instead of JSON. Just state the overshoot and
      // demand a shortened JSON object.
      content += `\n\nDer letzte Versuch hat die HARTEN Längen-Limits verletzt:\n- ${lengthOffenders.join('\n- ')}\n\nKürze die betroffenen Felder strikt unter ihr Limit (metaTitle/metaTitleEn ≤ 60, metaDescription/metaDescriptionEn ≤ 160). Antworte AUSSCHLIESSLICH mit dem aktualisierten JSON-Objekt — keine Erklärung, keine Prosa, kein Markdown-Fence.`;
    }
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      output_config: { effort: 'low' },
      cache_control: { type: 'ephemeral' },
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    });
    recordUsage(usage, msg.usage);
    return JSON.parse(extractJsonText(msg.content, docId)) as SeoGen;
  };

  let parsed: SeoGen;
  try {
    parsed = await callOnce('none');
  } catch (firstErr) {
    if (firstErr instanceof SyntaxError) {
      parsed = await callOnce('json');
    } else {
      throw firstErr;
    }
  }

  // Length-violation retry: Sonnet 4.6 routinely overshoots EN metaDescription
  // by 1-15 chars (~15% rate). Re-prompt with explicit char counts + overshoot
  // delta — cheaper than a manual cleanup pass after the full run.
  let validation = validateLengths(parsed, docId);
  if (!validation.ok) {
    try {
      parsed = await callOnce('length', validation.offenders);
    } catch (lenErr) {
      // Some retries come back as prose ("I'll count chars…") if the prompt
      // accidentally triggers reasoning-out-loud. One more attempt with the
      // stricter JSON-only reminder usually fixes it.
      if (lenErr instanceof SyntaxError) {
        parsed = await callOnce('json');
      } else {
        throw lenErr;
      }
    }
    validation = validateLengths(parsed, docId);
    if (!validation.ok) {
      // Still over after the re-prompt — trim rather than discard the document.
      for (const [key, max] of LENGTH_LIMITS) {
        const v = parsed[key];
        if (typeof v === 'string' && v.length > max) {
          parsed[key] = trimToLimit(v, max);
          console.warn(`     ${key}: ${v.length} → ${parsed[key].length} Zeichen hart gekürzt`);
        }
      }
    }
  }

  return parsed;
}

export function generateRestaurantSeo(r: RestaurantSource): Promise<SeoGen> {
  return generateSeoFromFacts(
    RESTAURANT_SEO_PROMPT,
    {
      name: r.name,
      description: r.description ?? null,
      descriptionEn: r.descriptionEn ?? null,
      shortDescription: r.shortDescription ?? null,
      cuisineType: r.cuisineType ?? null,
      district: r.district ?? null,
      categories: r.categories ?? [],
      priceLevel: priceSymbolFromRange(r.priceRange),
    },
    r._id
  );
}

function generateBezirkSeo(b: BezirkSource): Promise<SeoGen> {
  return generateSeoFromFacts(
    BEZIRK_SEO_PROMPT,
    {
      name: b.name,
      description: b.description ?? null,
      descriptionEn: b.descriptionEn ?? null,
    },
    b._id
  );
}

async function patchSeoDraft(doc: { _id: string }, type: DocType, g: SeoGen): Promise<void> {
  const draftId = doc._id.startsWith('drafts.') ? doc._id : `drafts.${doc._id}`;

  // Clone the full published doc into a draft if no draft exists yet — preserves
  // image, slug, openingHours, etc. so a later publish doesn't blow them away.
  await sanity.createIfNotExists({
    ...doc,
    _id: draftId,
    _type: type,
  } as { _id: string; _type: DocType } & Record<string, unknown>);

  // setIfMissing the parent seo object first — most docs have no seo block at
  // all, so a direct .set({'seo.metaTitle': ...}) on a missing parent would
  // create implicit nesting that's harder to reason about. Two separate awaits,
  // never transaction.patch(callback) — see feedback_sanity_transaction_patch_callback.md.
  await sanity
    .patch(draftId)
    .setIfMissing({ seo: {} })
    .set({
      'seo.metaTitle': g.metaTitle,
      'seo.metaTitleEn': g.metaTitleEn,
      'seo.metaDescription': g.metaDescription,
      'seo.metaDescriptionEn': g.metaDescriptionEn,
    })
    .commit({ autoGenerateArrayKeys: true });
}

function logSeoOutput(g: SeoGen): void {
  console.log(`     T  DE [${g.metaTitle.length}]: ${g.metaTitle}`);
  console.log(`     T  EN [${g.metaTitleEn.length}]: ${g.metaTitleEn}`);
  console.log(`     D  DE [${g.metaDescription.length}]: ${g.metaDescription}`);
  console.log(`     D  EN [${g.metaDescriptionEn.length}]: ${g.metaDescriptionEn}`);
}

async function main(): Promise<void> {
  const opts = parseArgs();
  console.log(
    `[generate-seo] type=${opts.type} limit=${opts.limit ?? 'all'} dryRun=${opts.dryRun}`
  );

  const stats = newStats();

  try {
    if (opts.type === 'restaurant' || opts.type === 'all') {
      let docs = await fetchRestaurants({
        draftsOnly: opts.draftsOnly,
        force: opts.force,
        onlyWithPhoto: opts.onlyWithPhoto,
      });
      if (opts.limit !== null) docs = docs.slice(0, opts.limit);
      console.log(`[generate-seo] restaurants needing seo fields: ${docs.length}`);
      for (const r of docs) {
        try {
          const g = await generateRestaurantSeo(r);
          console.log(`  ✓ ${r.name} (${r._id})`);
          logSeoOutput(g);
          if (!opts.dryRun) {
            await patchSeoDraft(r, 'restaurant', g);
            console.log(
              `     → patched draft ${r._id.startsWith('drafts.') ? r._id : `drafts.${r._id}`}`
            );
          }
          stats.ok++;
          // Gentle rate-limit: 200ms (~5 req/s, well under Anthropic limits).
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (e) {
          noteFailure(stats, `${r.name} (${r._id})`, e);
        }
      }
    }

    if (opts.type === 'bezirk' || opts.type === 'all') {
      let docs = await fetchBezirke({ draftsOnly: opts.draftsOnly, force: opts.force });
      if (opts.limit !== null) docs = docs.slice(0, opts.limit);
      console.log(`[generate-seo] bezirke needing seo fields: ${docs.length}`);
      for (const b of docs) {
        try {
          const g = await generateBezirkSeo(b);
          console.log(`  ✓ ${b.name} (${b._id})`);
          logSeoOutput(g);
          if (!opts.dryRun) {
            await patchSeoDraft(b, 'bezirk', g);
            console.log(
              `     → patched draft ${b._id.startsWith('drafts.') ? b._id : `drafts.${b._id}`}`
            );
          }
          stats.ok++;
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (e) {
          noteFailure(stats, `${b.name} (${b._id})`, e);
        }
      }
    }
  } catch (e) {
    reportFatal('generate-seo', e);
  } finally {
    finish('generate-seo', stats);
    reportUsage('generate-seo', usage, SONNET_5, stats.ok + stats.failed);
  }
}

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
function isCliEntry(): boolean {
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1] ?? '');
  } catch {
    return false;
  }
}
if (isCliEntry()) {
  main().catch((err) => {
    console.error('[generate-seo] FATAL:', err);
    process.exit(1);
  });
}
