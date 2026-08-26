/**
 * Imports a list of restaurants (name + coordinates) as Sanity drafts, one
 * after another, with a resumable state file. Wraps the same pipeline as
 * import-by-name.ts — this only adds batching, resume and a cost summary.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/import-batch.ts <list.json> --plan          # free: what would run, no API calls
 *   npx tsx scripts/import-batch.ts <list.json> --no-gallery    # hero photo only (1 Place Photo call each)
 *   npx tsx scripts/import-batch.ts <list.json> --no-gallery --limit 3
 *   npx tsx scripts/import-batch.ts <list.json>                 # hero + up to 3 gallery photos
 *
 * Flags:
 *   --plan          Print the plan and exit. Touches neither Google nor Sanity.
 *   --no-gallery    Skip gallery photos. Cuts Place Photo calls from up to 4 to 1 per spot.
 *   --dry-run       No Sanity write and no photos — but STILL one billed Text Search per spot.
 *   --limit <n>     Only process the first n unfinished entries.
 *   --skip-failed   Don't retry entries that failed on an earlier run.
 *   --delay <ms>    Pause between spots (default 250).
 *   --state <path>  State file location (default <list>.state.json).
 *
 * Input: a JSON array of objects with `name`, `lat`, `lng`. Extra keys are
 * ignored, so the same file can carry address/source columns for humans.
 *
 * Resume: every finished entry is written to the state file immediately, so
 * Ctrl-C is safe and a rerun picks up where it stopped. Entries already in
 * Sanity under the same Google Place ID are recorded as `duplicate` and never
 * retried — that check is the importer's own, not a name guess.
 *
 * Required env (in nextjs/.env.local):
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 *   GOOGLE_API_KEY          (Places API v1 enabled)
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { createClient } from '@sanity/client';
import { runImportFromParsed, ImportError } from './import-from-url';

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

interface Entry {
  name: string;
  lat: number;
  lng: number;
}

type Status = 'created' | 'duplicate' | 'failed';

interface StateRow {
  status: Status;
  /** Draft id in Sanity, for `created`. */
  id?: string;
  /** The name Google actually matched — often differs from the input name. */
  matched?: string;
  /** False when the spot has no usable owner photo on Places. */
  photo?: boolean;
  error?: string;
  at: string;
}

type State = Record<string, StateRow>;

/** Keyed on name + coordinates so correcting a name queues a fresh attempt
 *  instead of silently inheriting the old row's outcome. */
const keyOf = (e: Entry) => `${e.name}@${e.lat.toFixed(5)},${e.lng.toFixed(5)}`;

function parseList(path: string): Entry[] {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`Could not read ${path} as JSON: ${(err as Error).message}`);
  }
  if (!Array.isArray(raw)) throw new Error(`${path} must contain a JSON array.`);

  const out: Entry[] = [];
  raw.forEach((row, i) => {
    const r = row as Partial<Entry>;
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    const lat = Number(r.lat);
    const lng = Number(r.lng);
    if (!name) throw new Error(`Entry ${i} has no "name".`);
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
      throw new Error(`Entry ${i} ("${name}") has no finite lat/lng.`);
    out.push({ name, lat, lng });
  });

  const seen = new Set<string>();
  const dupes = out.filter((e) => !seen.add(keyOf(e)) && true);
  if (dupes.length)
    console.warn(`⚠ ${dupes.length} duplicate entries in the input file — they run only once.`);
  return out.filter((e, i, all) => all.findIndex((o) => keyOf(o) === keyOf(e)) === i);
}

function loadState(path: string): State {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as State;
  } catch {
    throw new Error(`State file ${path} is corrupt. Move it aside to start over.`);
  }
}

/** Write via a temp file + rename so a Ctrl-C mid-write can't truncate state. */
function saveState(path: string, state: State) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 1));
  renameSync(tmp, path);
}

function numFlag(args: string[], flag: string, fallback: number): number {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const v = Number(args[i + 1]);
  if (!Number.isFinite(v)) throw new Error(`${flag} needs a number.`);
  return v;
}

function strFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const plan = args.includes('--plan');
  const dryRun = args.includes('--dry-run');
  const noGallery = args.includes('--no-gallery');
  const skipFailed = args.includes('--skip-failed');
  const delay = numFlag(args, '--delay', 250);
  const limit = numFlag(args, '--limit', Infinity);

  // Values belonging to a value-taking flag are not the list path. Guard on
  // presence: indexOf returns -1 when the flag is absent, and args[-1 + 1] is
  // the first argument — which is the list path itself.
  const valueIndexes = new Set(
    ['--limit', '--delay', '--state']
      .map((f) => args.indexOf(f))
      .filter((i) => i !== -1)
      .map((i) => i + 1)
  );
  const listPath = args.find((a, i) => !a.startsWith('--') && !valueIndexes.has(i));
  if (!listPath) {
    console.error('Usage: npx tsx scripts/import-batch.ts <list.json> [--plan] [--no-gallery]');
    console.error(
      '       [--dry-run] [--limit <n>] [--skip-failed] [--delay <ms>] [--state <path>]'
    );
    process.exit(1);
  }
  const statePath = strFlag(args, '--state') ?? `${listPath.replace(/\.json$/, '')}.state.json`;

  const entries = parseList(listPath);
  const state = loadState(statePath);

  const done = entries.filter((e) => {
    const s = state[keyOf(e)];
    return s?.status === 'created' || s?.status === 'duplicate';
  });
  const failedBefore = entries.filter((e) => state[keyOf(e)]?.status === 'failed');
  let queue = entries.filter((e) => !done.includes(e));
  if (skipFailed) queue = queue.filter((e) => !failedBefore.includes(e));
  if (Number.isFinite(limit)) queue = queue.slice(0, limit);

  const photoCallsEach = noGallery ? 1 : 4;
  console.log(`→ List:   ${listPath} (${entries.length} entries)`);
  console.log(`  State:  ${statePath}`);
  console.log(
    `  Done:   ${done.length} · failed before: ${failedBefore.length} · queued now: ${queue.length}`
  );
  console.log(
    `  Photos: ${noGallery ? 'hero only' : 'hero + up to 3 gallery'}${dryRun ? ' (--dry-run: none)' : ''}`
  );
  console.log(
    `  Budget: ${queue.length} Text Search calls` +
      (dryRun ? '' : ` + up to ${queue.length * photoCallsEach} Place Photo calls`)
  );

  if (plan) {
    console.log('\n--plan: nothing called, nothing written.');
    if (queue.length) {
      console.log('\nNext up:');
      queue.slice(0, 10).forEach((e, i) => console.log(`  ${i + 1}. ${e.name}`));
      if (queue.length > 10) console.log(`  … and ${queue.length - 10} more`);
    }
    return;
  }
  if (!queue.length) {
    console.log('\nNothing to do.');
    return;
  }
  if (dryRun) console.log('\n⚠ --dry-run still spends one billed Text Search per spot.');

  let created = 0;
  let duplicate = 0;
  let failed = 0;
  let withoutPhoto = 0;
  const width = String(queue.length).length;

  for (const [i, entry] of queue.entries()) {
    const label = `[${String(i + 1).padStart(width)}/${queue.length}] ${entry.name}`;
    const fakeUrl = `https://www.google.com/maps/place/${encodeURIComponent(entry.name)}/@${entry.lat},${entry.lng},17z`;

    try {
      const result = await runImportFromParsed(entry, fakeUrl, {
        uploadPhoto: !dryRun,
        uploadGallery: !noGallery,
      });

      if (dryRun) {
        console.log(`${label} → would create "${result.matchedName}"`);
      } else {
        const doc = await sanity.create(result.doc);
        const hasPhoto = Boolean(result.photoAsset);
        if (!hasPhoto) withoutPhoto++;
        state[keyOf(entry)] = {
          status: 'created',
          id: doc._id,
          matched: result.matchedName,
          photo: hasPhoto,
          at: new Date().toISOString(),
        };
        saveState(statePath, state);
        created++;
        const note = result.matchedName === entry.name ? '' : ` → "${result.matchedName}"`;
        console.log(`${label}${note}  ✓ ${hasPhoto ? 'draft + hero' : 'draft, NO photo'}`);
      }
    } catch (err) {
      if (err instanceof ImportError && err.code === 'duplicate') {
        state[keyOf(entry)] = {
          status: 'duplicate',
          error: err.message,
          at: new Date().toISOString(),
        };
        saveState(statePath, state);
        duplicate++;
        console.log(`${label}  – already in Sanity`);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        state[keyOf(entry)] = { status: 'failed', error: message, at: new Date().toISOString() };
        saveState(statePath, state);
        failed++;
        console.log(`${label}  ✗ ${message}`);
      }
    }

    if (delay && i < queue.length - 1) await sleep(delay);
  }

  console.log(`\n→ Created ${created} · already there ${duplicate} · failed ${failed}`);
  if (withoutPhoto)
    console.log(
      `  ${withoutPhoto} draft${withoutPhoto === 1 ? '' : 's'} without a photo — no owner upload on Places.\n` +
        '  Those render the empty hero until an image is set in Studio.'
    );
  if (failed)
    console.log(
      `  Rerun the same command to retry the ${failed} failed; --skip-failed leaves them out.`
    );
  if (created) console.log('  Drafts are unpublished — review and publish in Studio.');
}

main().catch((err) => {
  console.error(err instanceof Error ? `✗ ${err.message}` : err);
  process.exit(1);
});
