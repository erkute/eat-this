// Holt die aktivierte Desktop-Markenschrift aus dem Creative-Cloud-Ordner nach
// assets/fonts/, damit `npm run build:email-art` sie rendern kann.
//
// Adobe Fonts liefert nie eine herunterladbare Datei: aktivierte Schriften
// landen als OTF mit anonymisiertem Namen (z. B. `.29488.otf`) unter
// ~/Library/Application Support/Adobe/CoreSync/plugins/livetype/.r/. Dieses
// Skript liest die Namenstabelle jeder Kandidatendatei und kopiert die
// passenden Schnitte unter sprechendem Namen ins Repo.
//
// Run:  npm run sync:brand-font          (danach: npm run build:email-art)
//
// Die kopierte Datei bleibt lokal — assets/fonts/Providence* ist in
// .gitignore. Eine lizenzierte Schrift gehört nicht ins Repository; gerendert
// wird sie hier zu PNGs, und nur die werden ausgeliefert.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const FONT_DIR = join(process.cwd(), 'assets', 'fonts');

const SEARCH_DIRS = [
  join(homedir(), 'Library/Application Support/Adobe/CoreSync/plugins/livetype/.r'),
  join(homedir(), 'Library/Fonts'),
  '/Library/Fonts',
];

/** Was wir suchen — die Familie, auf der das Home-Design steht. */
const WANTED = /providence/i;

// ---------------------------------------------------------------------------
// Minimaler sfnt-Parser: nur die `name`-Tabelle, nur die Records, die wir
// brauchen. Keine Abhängigkeit für 60 Zeilen Bit-Schubserei.
// ---------------------------------------------------------------------------

const NAME_FAMILY = 1;
const NAME_SUBFAMILY = 2;
const NAME_TYPO_FAMILY = 16;
const NAME_TYPO_SUBFAMILY = 17;

function readNameTable(buf: Buffer): Map<number, string> | null {
  const out = new Map<number, string>();
  if (buf.length < 12) return null;

  const tag = buf.readUInt32BE(0);
  // 0x00010000 = TrueType, 'OTTO' = CFF, 'true'/'ttcf' = Apple-Varianten.
  const isSfnt = tag === 0x00010000 || tag === 0x4f54544f || tag === 0x74727565;
  if (!isSfnt) return null;

  const numTables = buf.readUInt16BE(4);
  let nameOffset = 0;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (rec + 16 > buf.length) return null;
    if (buf.toString('latin1', rec, rec + 4) === 'name') {
      nameOffset = buf.readUInt32BE(rec + 8);
      break;
    }
  }
  if (!nameOffset || nameOffset + 6 > buf.length) return null;

  const count = buf.readUInt16BE(nameOffset + 2);
  const stringOffset = nameOffset + buf.readUInt16BE(nameOffset + 4);

  for (let i = 0; i < count; i++) {
    const rec = nameOffset + 6 + i * 12;
    if (rec + 12 > buf.length) break;
    const platformId = buf.readUInt16BE(rec);
    const nameId = buf.readUInt16BE(rec + 6);
    const length = buf.readUInt16BE(rec + 8);
    const offset = stringOffset + buf.readUInt16BE(rec + 10);
    if (offset + length > buf.length) continue;

    const raw = buf.subarray(offset, offset + length);
    // Platform 3 (Windows) und 0 (Unicode) sind UTF-16BE, Platform 1 (Mac) ist
    // MacRoman — für lateinische Namen deckt sich das mit latin1.
    const value =
      platformId === 1 ? raw.toString('latin1') : raw.swap16().toString('utf16le');

    // Erster Treffer gewinnt; die Windows-Records stehen üblicherweise vorn.
    if (!out.has(nameId)) out.set(nameId, value.replace(/\0/g, '').trim());
  }
  return out;
}

interface Candidate {
  path: string;
  family: string;
  style: string;
  bold: boolean;
}

async function scan(dir: string): Promise<Candidate[]> {
  const entries = await readdir(dir).catch(() => null);
  if (!entries) return [];

  const found: Candidate[] = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const buf = await readFile(path).catch(() => null);
    if (!buf) continue;

    const names = readNameTable(buf);
    if (!names) continue;

    const family = names.get(NAME_TYPO_FAMILY) ?? names.get(NAME_FAMILY) ?? '';
    const style = names.get(NAME_TYPO_SUBFAMILY) ?? names.get(NAME_SUBFAMILY) ?? 'Regular';
    if (!WANTED.test(family)) continue;

    // Kursive und Schmalschnitte interessieren nicht — die Mails setzen nur
    // Regular und Bold.
    if (/italic|oblique/i.test(style)) continue;

    found.push({ path, family, style, bold: /bold|black|heavy|semibold/i.test(style) });
  }
  return found;
}

const hits: Candidate[] = [];
for (const dir of SEARCH_DIRS) hits.push(...(await scan(dir)));

if (hits.length === 0) {
  console.error(
    '\n❌ Keine Providence-Schnitte gefunden. Durchsucht:\n' +
      SEARCH_DIRS.map((d) => `   ${d}`).join('\n') +
      '\n\nSo kommt die Datei dorthin:\n' +
      '  1. fonts.adobe.com/fonts/ff-providence-sans öffnen\n' +
      '  2. Bei den Schnitten auf „Schriften aktivieren" (nicht „Zu Web-Projekt hinzufügen")\n' +
      '     — Regular 400 und Bold 700 genügen\n' +
      '  3. Creative-Cloud-App muss laufen und angemeldet sein; sie synchronisiert\n' +
      '     die Datei dann von selbst. Einen Download-Button gibt es nicht.\n' +
      '  4. Dieses Skript erneut starten.\n'
  );
  process.exit(1);
}

await mkdir(FONT_DIR, { recursive: true });

const regular = hits.find((h) => !h.bold) ?? hits[0];
const bold = hits.find((h) => h.bold) ?? regular;

for (const [target, hit] of [
  ['ProvidenceSansPro-Regular.otf', regular],
  ['ProvidenceSansPro-Bold.otf', bold],
] as const) {
  await writeFile(join(FONT_DIR, target), await readFile(hit.path));
  console.log(`  ${target}  ←  ${hit.family} ${hit.style}`);
}

if (regular === bold) {
  console.warn(
    '\n⚠️  Nur ein Schnitt gefunden — Regular und Bold sind identisch.\n' +
      '   Aktiviere in Creative Cloud zusätzlich den fehlenden Schnitt, sonst\n' +
      '   setzen die Headlines nicht in 700.'
  );
}

console.log('\nJetzt: npm run build:email-art');
