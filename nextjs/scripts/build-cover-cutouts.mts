// Stellt die Aufmacher-Bilder der Magazin-Artikel frei — für die fünf
// Freisteller-Looks der Heft-Cover (lib/magazineCover.ts).
//
// Warum ein Skript und keine Laufzeit-Route: das Freistellen ist Apples Vision
// (scripts/cover-cutout/cutout.swift) und läuft nur auf macOS. App Hosting ist
// Linux. Das Skript läuft deshalb lokal oder im GitHub-Job „Heft-Cover
// freistellen“ auf einem Mac-Runner und legt das Ergebnis in Sanity ab.
//
// Bearbeitet werden nur Artikel, deren Aufmacher-Bild noch nicht freigestellt
// ist (`cover.source` ≠ Bild-Asset) — ein neuer Artikel oder ein getauschtes
// Foto. Geschrieben werden ausschliesslich die Automatik-Felder unter `cover`
// (Freisteller, Rahmen, „Gericht erkannt“, Quelle), nie der von Hand gewählte
// Look und nie etwas Redaktionelles. Liegt zum Artikel ein Entwurf, bekommt er
// dieselben Felder, damit ein späteres Veröffentlichen sie nicht wieder
// löscht.
//
// Run:  npm run build:cover-cutouts                 # nur Offene
//       npm run build:cover-cutouts -- --dry-run    # nur zeigen, nichts schreiben
//       npm run build:cover-cutouts -- --all        # alle neu
//       npm run build:cover-cutouts -- --slug crapulix-croissant-steglitz
//
// Braucht SANITY_API_WRITE_TOKEN (aus .env.local oder der Umgebung).

import { createClient } from '@sanity/client';
import { config as loadEnv } from 'dotenv';
import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { isDish, usableCutout, type CutoutReport } from '../lib/magazineCover.ts';

loadEnv({ path: '.env.local', quiet: true });
const run = promisify(execFile);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const all = args.includes('--all');
const slugArg = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

const token = process.env.SANITY_API_WRITE_TOKEN;
if (!token && !dryRun) {
  console.error('❌ SANITY_API_WRITE_TOKEN fehlt (.env.local oder Umgebung).');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? 'ehwjnjr2',
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
  perspective: 'published',
});

/** Der Filter, an dem auch der GitHub-Job erkennt, ob es etwas zu tun gibt. */
const PENDING = '!(cover.source == image.asset._ref)';

interface Article {
  _id: string;
  slug: string;
  ref: string;
  url: string;
}

const filter = [
  '_type == "newsArticle"',
  'defined(slug.current)',
  'defined(image.asset)',
  slugArg ? 'slug.current == $slug' : all ? null : PENDING,
]
  .filter(Boolean)
  .join(' && ');

const articles = await client.fetch<Article[]>(
  `*[${filter}] | order(date desc) { _id, "slug": slug.current, "ref": image.asset._ref, "url": image.asset->url }`,
  slugArg ? { slug: slugArg } : {}
);

if (!articles.length) {
  console.log('✓ Nichts zu tun — alle Aufmacher-Bilder sind freigestellt.');
  process.exit(0);
}
console.log(`${articles.length} Artikel ${dryRun ? '(Probelauf, nichts wird geschrieben)' : ''}`);

const work = await mkdtemp(join(tmpdir(), 'cover-cutout-'));
const tool = join(work, 'cutout');
try {
  await run('swiftc', ['-O', join(process.cwd(), 'scripts/cover-cutout/cutout.swift'), '-o', tool]);

  for (const a of articles) {
    const photo = join(work, `${a.slug}.jpg`);
    const cutout = join(work, `${a.slug}.png`);
    // 1600 ist die Obergrenze, mit der die Import-Skripte Fotos ziehen; mehr
    // braucht auch das grösste Heft (440px, 2x) nicht. Ohne Zuschnitt, damit
    // der Freisteller deckungsgleich auf dem ausgelieferten Foto liegt.
    const res = await fetch(`${a.url}?w=1600&fm=jpg&q=90`);
    if (!res.ok) {
      console.warn(`⚠️  ${a.slug}: Foto nicht ladbar (${res.status})`);
      continue;
    }
    await writeFile(photo, Buffer.from(await res.arrayBuffer()));
    const { stdout } = await run(tool, [photo, cutout]);
    const report = JSON.parse(stdout.trim().split('\n').pop()!) as CutoutReport;
    const usable = usableCutout(report);
    const dish = isDish(report);
    const food = (report.labels?.food ?? 0).toFixed(2);
    console.log(
      `${dish ? '🍽 ' : usable ? '◻︎ ' : '· '} ${a.slug}  food=${food} edges=${report.edges ?? '-'} motive=${report.instances ?? 0}${dish ? '  → Gericht' : ''}`
    );
    if (dryRun) continue;

    const fields: Record<string, unknown> = { 'cover.source': a.ref, 'cover.dish': dish };
    const unset: string[] = [];
    if (usable && report.box) {
      // Vision schreibt unkomprimiert; das meiste ist Transparenz und
      // schrumpft auf einen Bruchteil.
      const png = await sharp(await readFile(cutout))
        .png({ compressionLevel: 9, palette: false })
        .toBuffer();
      const asset = await client.assets.upload('image', png, {
        filename: `cover-${a.slug}.png`,
        contentType: 'image/png',
      });
      fields['cover.cutout'] = { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
      fields['cover.box'] = report.box;
    } else {
      unset.push('cover.cutout', 'cover.box');
    }

    const draftId = `drafts.${a._id}`;
    const hasDraft = await client.fetch<boolean>(
      'defined(*[_id == $id][0]._id)',
      { id: draftId },
      { perspective: 'raw' }
    );
    const tx = client.transaction();
    for (const id of hasDraft ? [a._id, draftId] : [a._id]) {
      tx.patch(id, (p) => {
        const patch = p.setIfMissing({ cover: {} }).set(fields);
        return unset.length ? patch.unset(unset) : patch;
      });
    }
    await tx.commit({ visibility: 'async' });
  }
} finally {
  await rm(work, { recursive: true, force: true });
}
console.log(dryRun ? '✓ Probelauf fertig.' : '✓ Fertig.');
