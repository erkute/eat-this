/**
 * Wächter über Remys Vektor-Index: deckt er noch den Katalog ab?
 *
 * Der Index ist eine eingecheckte Momentaufnahme, die nichts automatisch
 * nachzieht — warum das still schiefgeht, steht in `scripts/lib/embeddings-index.ts`.
 * Dieses Skript ist die Hälfte der Prüfung, die Netz braucht; die Form der
 * Datei prüft `scripts/lib/embeddings-index.test.ts` in jedem `npm test` mit.
 *
 * Run from `nextjs/`:
 *   npm run check:embeddings
 *   npm run check:embeddings -- --max-missing-pct=0    # strenger
 *
 * Liest nur den öffentlichen Datensatz — kein Token nötig.
 * Exit 1 = Index reparaturbedürftig (`npm run embed:restaurants`).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';
import { VOYAGE_MODEL, VOYAGE_DIM } from '../lib/buddy/voyage';
import {
  checkIndexShape,
  compareToCatalog,
  EMBEDDINGS_PATH,
  LIVE_SLUGS_QUERY,
  type EmbeddingsIndex,
} from './lib/embeddings-index';

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  // Wie content-lint: ein Wächter muss den Stand von jetzt sehen, sonst meldet
  // er nach einem Neubau noch minutenlang die alte Lücke.
  useCdn: false,
});

const DEFAULT_MAX_MISSING_PCT = 5;

function argPct(): number {
  const raw = process.argv.find((a) => a.startsWith('--max-missing-pct='))?.split('=')[1];
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MAX_MISSING_PCT;
}

async function main() {
  const index = JSON.parse(readFileSync(EMBEDDINGS_PATH, 'utf8')) as EmbeddingsIndex;
  const shape = checkIndexShape(index, { model: VOYAGE_MODEL, dim: VOYAGE_DIM });
  for (const f of shape) console.log(`FAIL form  — ${f}`);

  let live: string[];
  try {
    live = (await client.fetch<string[]>(LIVE_SLUGS_QUERY)) ?? [];
  } catch (err) {
    // Sanity ist gestört oder das Kontingent ist leer. Das ist ein Befund über
    // Sanity, nicht über den Index — und dafür gibt es den Uptime-Job, der es
    // alle zehn Minuten prüft und ein Issue aufmacht. Hier würde daraus nur
    // ein roter PR, der nichts mit dem PR zu tun hat.
    console.log(
      `INFO       — Katalog nicht abrufbar, Abgleich übersprungen: ${String(err).slice(0, 200)}`
    );
    process.exit(shape.length > 0 ? 1 : 0);
  }
  if (live.length === 0) {
    console.log('INFO       — Katalog kam leer zurück, Abgleich übersprungen.');
    process.exit(shape.length > 0 ? 1 : 0);
  }

  const maxPct = argPct();
  const drift = compareToCatalog(Object.keys(index.vectors), live, maxPct);
  const pct = drift.missingPct.toFixed(1);

  console.log(
    `Index ${drift.indexed} Vektoren · Katalog ${drift.live} Spots · ohne Vektor ${drift.missing.length} (${pct} %) · verwaist ${drift.orphans.length}`
  );
  // Gekappt: bei einem grossen Drift ist die vollstaendige Liste im CI-Log
  // eine Wand, und die Zahl daneben sagt schon alles.
  const list = (slugs: string[], n = 20) =>
    slugs.slice(0, n).join(', ') + (slugs.length > n ? ` … (+${slugs.length - n})` : '');
  if (drift.missing.length > 0) {
    console.log(`  ohne Vektor: ${list(drift.missing)}`);
  }
  if (drift.orphans.length > 0) {
    // Harmlos: GROQ liefert sie nie als Kandidat. Nur der Vollständigkeit halber.
    console.log(`  verwaist (nicht mehr im Katalog): ${list(drift.orphans)}`);
  }

  if (drift.overBudget) {
    console.log(
      `\nFAIL drift — ${pct} % des Katalogs haben keinen Vektor (Budget ${maxPct} %). Diese Spots rutschen beim semantischen Ranking ans Ende und tauchen in Remys Antworten praktisch nicht auf.\n` +
        `             Beheben mit: npm run embed:restaurants  (braucht VOYAGE_API_KEY, laeuft ~5 min)`
    );
  }

  if (shape.length > 0 || drift.overBudget) process.exit(1);
  console.log('OK         — Index deckt den Katalog.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
