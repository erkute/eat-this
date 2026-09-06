/**
 * Waechter ueber Remys Vektor-Indizes: decken sie noch den Bestand ab?
 *
 * Die Indizes sind eingecheckte Momentaufnahmen, die nichts nachziehen — warum
 * das still schiefgeht, steht in `scripts/lib/embeddings-index.ts`. Dieses
 * Skript ist die Haelfte der Pruefung, die Netz braucht; die Form der Dateien
 * prueft `scripts/lib/embeddings-index.test.ts` in jedem `npm test` mit.
 *
 * Run from `nextjs/`:
 *   npm run check:embeddings
 *
 * Liest nur den oeffentlichen Datensatz — kein Token noetig.
 * Exit 1 = mindestens ein Index reparaturbeduerftig.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';
import { VOYAGE_MODEL, VOYAGE_DIM } from '../lib/buddy/voyage';
import {
  ALL_INDEXES,
  checkIndexShape,
  compareToCatalog,
  type EmbeddingsIndex,
  type IndexSpec,
} from './lib/embeddings-index';

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  // Wie content-lint: ein Waechter muss den Stand von jetzt sehen, sonst meldet
  // er nach einem Neubau noch minutenlang die alte Luecke.
  useCdn: false,
});

const list = (slugs: string[], n = 20) =>
  slugs.slice(0, n).join(', ') + (slugs.length > n ? ` … (+${slugs.length - n})` : '');

/** true = dieser Index ist in Ordnung. */
async function checkOne(spec: IndexSpec): Promise<boolean> {
  let index: EmbeddingsIndex;
  try {
    index = JSON.parse(readFileSync(spec.path, 'utf8')) as EmbeddingsIndex;
  } catch (err) {
    console.log(`FAIL ${spec.label} — ${spec.path} nicht lesbar: ${String(err).slice(0, 160)}`);
    console.log(`     Beheben mit: ${spec.rebuildCommand}`);
    return false;
  }

  const shape = checkIndexShape(index, { model: VOYAGE_MODEL, dim: VOYAGE_DIM });
  for (const f of shape) console.log(`FAIL ${spec.label} Form — ${f}`);

  let live: string[];
  try {
    live = (await client.fetch<string[]>(spec.slugsQuery)) ?? [];
  } catch (err) {
    // Sanity ist gestoert oder das Kontingent ist leer. Das ist ein Befund
    // ueber Sanity, nicht ueber den Index — und dafuer gibt es den Uptime-Job.
    // Hier wuerde daraus nur ein roter PR, der nichts mit dem PR zu tun hat.
    console.log(
      `INFO ${spec.label} — Bestand nicht abrufbar, Abgleich uebersprungen: ${String(err).slice(0, 160)}`
    );
    return shape.length === 0;
  }
  if (live.length === 0) {
    console.log(`INFO ${spec.label} — Bestand kam leer zurueck, Abgleich uebersprungen.`);
    return shape.length === 0;
  }

  const drift = compareToCatalog(Object.keys(index.vectors), live, spec.maxMissingPct);
  const pct = drift.missingPct.toFixed(1);
  console.log(
    `${spec.label}: Index ${drift.indexed} · Bestand ${drift.live} · ohne Vektor ${drift.missing.length} (${pct} %) · verwaist ${drift.orphans.length}`
  );
  if (drift.missing.length > 0) console.log(`  ohne Vektor: ${list(drift.missing)}`);
  // Verwaiste sind harmlos: GROQ liefert sie nie als Kandidat. Nur der
  // Vollstaendigkeit halber.
  if (drift.orphans.length > 0) console.log(`  verwaist: ${list(drift.orphans)}`);

  if (drift.overBudget) {
    console.log(
      `FAIL ${spec.label} Drift — ${pct} % ohne Vektor (Budget ${spec.maxMissingPct} %). Diese Eintraege ranken ans Ende und tauchen in Remys Antworten praktisch nicht auf.\n` +
        `     Beheben mit: ${spec.rebuildCommand}  (braucht VOYAGE_API_KEY)`
    );
  }
  return shape.length === 0 && !drift.overBudget;
}

async function main() {
  const results = await Promise.all(ALL_INDEXES.map(checkOne));
  if (results.some((ok) => !ok)) process.exit(1);
  console.log('OK — beide Indizes decken ihren Bestand.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
