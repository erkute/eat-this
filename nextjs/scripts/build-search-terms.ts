/**
 * Baut den Suchindex der Map: je Spot die Wörter, unter denen man ihn finden
 * soll — was es dort zu essen und zu trinken gibt und was für ein Laden er
 * ist, auf Deutsch und Englisch, in den Wörtern, die man tippt.
 *
 * Bis 30.10.2026 durchsuchte die Map die ganzen Beschreibungen. Dann zählt
 * jede Erwähnung: der Burger-Pop-up „im Eisladen Kuréme" war ein Eis-Treffer,
 * „Turkish Eggs" ein Döner-Treffer, der „Bürgersteig" ein Burger. Ein Modell
 * liest die Beschreibung einmal und schreibt nur auf, was der Spot anbietet.
 *
 * Schreibt lib/map/search-terms.json (eingecheckt, liest cached-sanity.ts).
 * Inkrementell: ein Spot wird nur neu gelesen, wenn sich sein Text geändert
 * hat. Nach neuen Spots oder geänderten Beschreibungen laufen lassen; ein Spot
 * ohne Eintrag bleibt über seine Beschreibung findbar.
 *
 * Aus `nextjs/`:
 *   npm run search:terms            # nur neue und geänderte Spots
 *   npm run search:terms -- --all   # alles neu
 *   npm run search:terms -- --only=Hasir,Imren   # nur diese Spots neu
 *   npm run search:terms -- --dump=spots.json    # Eingaben nur ausgeben
 *   npm run search:terms -- --from=terms.json    # Wörter übernehmen statt lesen
 *
 * `--dump` und `--from` sind der Weg ohne API: die Eingaben ausgeben, die
 * Wörter nach derselben Anleitung (SYSTEM) anderswo schreiben — etwa in einer
 * Claude-Code-Sitzung — und als { "<_id>": ["wort", …] } zurückgeben. Sie
 * bekommen dieselbe Prüfsumme wie ein API-Lauf.
 *
 * Braucht ANTHROPIC_API_KEY in nextjs/.env.local.
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@sanity/client';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { liveRestaurant } from '../lib/sanity-filters';
import { newUsage, recordUsage, reportUsage, OPUS_5_5 } from './lib/run-usage';

loadEnv({ path: '.env.local' });

const MODEL = 'claude-opus-5-5';
const OUT_PATH = join(process.cwd(), 'lib/map/search-terms.json');
const CONCURRENCY = 6;

/* Ändert sich die Anleitung, gilt jeder Eintrag als veraltet. */
const PROMPT_VERSION = 1;

const SYSTEM = `Du baust den Suchindex einer Berliner Restaurant-Karte. Gäste tippen Wörter wie „Döner", „Nudeln", „Eis", „Frühstück", „Wein" und erwarten nur Spots, an denen es das wirklich gibt.

Du bekommst einen Spot mit Name, Küche, Kategorien und redaktionellen Texten (Deutsch und Englisch). Gib die Suchwörter zurück, unter denen dieser Spot gefunden werden soll.

Hinein gehört:
- Jedes Gericht, Getränk und Produkt, das der Spot laut Text anbietet, konkret (z. B. „tonkotsu", „cacio e pepe", „franzbrötchen", „naturwein").
- Zu jedem davon die Alltagswörter, unter denen man es sucht, auf Deutsch und Englisch: Ramen → ramen, nudelsuppe, nudeln, noodles, suppe, soup. Pasta oder Ravioli → pasta, nudeln, noodles. Gelato → eis, ice cream, gelato. Döner → döner, kebab. Croissant → croissant, gebäck, pastry. Espresso → kaffee, coffee.
- Was für ein Laden er ist und wofür man hingeht, sofern der Text es trägt: bäckerei, bakery, café, weinbar, wine bar, cocktailbar, bar, imbiss, eisdiele, frühstück, breakfast, brunch, mittagessen, lunch, abendessen, dinner, take-away.
- vegan, vegetarisch, glutenfrei nur, wenn der Text sagt, dass es das dort gibt.

Nicht hinein gehört, auch wenn das Wort im Text steht:
- Was nur erwähnt wird: Nachbarn, Vorgänger im selben Raum, frühere Stationen des Teams, Vergleiche, Herkunft von Personen („der Londoner"), Orte („im Eisladen Kuréme", „Bürgersteig").
- Was ausdrücklich fehlt („keine Pizza").
- Zutaten, die nur Teil eines Gerichts sind, als eigenes Hauptwort, wenn man den Spot dafür nicht suchen würde: „Turkish Eggs mit Joghurt" macht den Spot nicht zu einem Joghurt- oder Döner-Laden. Das Gericht selbst („turkish eggs", „eier", „eggs") gehört hinein.
- Name, Bezirk, Adresse, Preise, Öffnungszeiten, Personen, Auszeichnungen — die kennt die Suche schon.

Schreibweise: klein, Umlaute wie im Deutschen, Einzahl oder die übliche Form, keine Sätze. Mehrteilige Begriffe mit Leerzeichen („wine bar"). Höchstens 60 Wörter, die wichtigsten zuerst. Erfinde nichts, was der Text nicht hergibt.`;

const SCHEMA = {
  type: 'object',
  properties: { terms: { type: 'array', items: { type: 'string' } } },
  required: ['terms'],
  additionalProperties: false,
} as const;

interface Row {
  _id: string;
  name: string;
  cuisineType?: string;
  categories?: string[];
  texts?: string[];
}

interface Entry {
  /** Prüfsumme des Eingabetexts und der Anleitung. */
  h: string;
  /** Die Suchwörter. */
  t: string[];
}

const QUERY = `*[_type == "restaurant" && ${liveRestaurant()}] | order(_id asc) {
  _id,
  name,
  cuisineType,
  "categories": categories[defined(@->_id)]->name,
  "texts": array::compact([shortDescription, description, tip, shortDescriptionEn, descriptionEn, tipEn])
}`;

function sourceText(r: Row): string {
  return [
    `Name: ${r.name}`,
    r.cuisineType ? `Küche: ${r.cuisineType}` : null,
    r.categories?.length ? `Kategorien: ${r.categories.join(', ')}` : null,
    '',
    ...(r.texts ?? []),
  ]
    .filter((line) => line !== null)
    .join('\n');
}

const hashOf = (text: string) =>
  createHash('sha256').update(`${PROMPT_VERSION}\n${text}`).digest('hex').slice(0, 16);

const anthropic = new Anthropic();
const usage = newUsage();

async function termsFor(text: string): Promise<string[] | null> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: text }],
  });
  recordUsage(usage, msg.usage);
  if (msg.stop_reason !== 'end_turn') return null;
  const block = msg.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') return null;
  const { terms } = JSON.parse(block.text) as { terms: string[] };
  return [...new Set(terms.map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

/* Feste Reihenfolge, damit der Diff nur zeigt, was sich geändert hat. */
function writeIndex(entries: Record<string, Entry>): void {
  const sorted = Object.fromEntries(Object.keys(entries).sort().map((id) => [id, entries[id]]));
  writeFileSync(OUT_PATH, `${JSON.stringify(sorted, null, 1)}\n`);
  console.log(`${Object.keys(sorted).length} Einträge geschrieben`);
}

function argValue(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main() {
  const dumpPath = argValue('dump');
  const fromPath = argValue('from');
  if (!dumpPath && !fromPath && !process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY fehlt in nextjs/.env.local');
    process.exit(1);
  }
  const all = process.argv.includes('--all');
  const only = argValue('only')
    ?.split(',')
    .map((n) => n.trim().toLowerCase());
  const client = createClient({
    projectId: 'ehwjnjr2',
    dataset: 'production',
    apiVersion: '2024-01-01',
    useCdn: false,
  });
  const rows = await client.fetch<Row[]>(QUERY);
  const previous: Record<string, Entry> = existsSync(OUT_PATH)
    ? JSON.parse(readFileSync(OUT_PATH, 'utf8'))
    : {};

  const next: Record<string, Entry> = {};
  const todo: { row: Row; text: string; h: string }[] = [];
  for (const row of rows) {
    const text = sourceText(row);
    const h = hashOf(text);
    const picked = only ? only.some((n) => row.name.toLowerCase().includes(n)) : all;
    if (!picked && previous[row._id]?.h === h) next[row._id] = previous[row._id];
    else if (only && !picked) continue;
    else todo.push({ row, text, h });
  }
  console.log(`${rows.length} Spots, ${todo.length} neu zu lesen`);

  if (dumpPath) {
    writeFileSync(dumpPath, JSON.stringify(todo.map((j) => ({ id: j.row._id, text: j.text })), null, 1));
    console.log(`Eingaben nach ${dumpPath} geschrieben`);
    return;
  }
  if (fromPath) {
    const given: Record<string, string[]> = JSON.parse(readFileSync(fromPath, 'utf8'));
    for (const job of todo) {
      const terms = given[job.row._id]?.map((t) => t.trim().toLowerCase()).filter(Boolean);
      if (terms?.length) next[job.row._id] = { h: job.h, t: [...new Set(terms)] };
      else if (previous[job.row._id]) next[job.row._id] = previous[job.row._id];
    }
    writeIndex(next);
    return;
  }

  const failed: string[] = [];
  let fatal: Error | null = null;
  let done = 0;
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let job = queue.shift(); job && !fatal; job = queue.shift()) {
        /* Misslingt ein Spot, bleibt sein alter Eintrag stehen. */
        const keep = () => {
          if (previous[job.row._id]) next[job.row._id] = previous[job.row._id];
        };
        try {
          const terms = await termsFor(job.text);
          if (terms?.length) next[job.row._id] = { h: job.h, t: terms };
          else {
            failed.push(job.row.name);
            keep();
          }
        } catch (err) {
          /* Kein Guthaben, falscher Schlüssel: jeder weitere Aufruf scheitert
             genauso. Abbrechen, die Datei bleibt, wie sie war. */
          if (
            err instanceof Anthropic.BadRequestError ||
            err instanceof Anthropic.AuthenticationError ||
            err instanceof Anthropic.PermissionDeniedError
          ) {
            fatal = err;
            return;
          }
          failed.push(`${job.row.name} (${(err as Error).message})`);
          keep();
        }
        done += 1;
        if (done % 20 === 0) console.log(`  ${done}/${todo.length}`);
      }
    })
  );

  if (fatal) {
    console.error(`Abgebrochen, nichts geschrieben: ${(fatal as Error).message}`);
    process.exit(1);
  }

  writeIndex(next);
  if (failed.length) console.log(`Ohne Eintrag (bleiben über die Beschreibung findbar): ${failed.join(', ')}`);
  reportUsage('search-terms', usage, OPUS_5_5, todo.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
