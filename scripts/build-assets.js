// scripts/build-assets.js
// Minifies source JS and CSS files into sibling *.min.{js,css} artifacts.
// Ran as part of `firebase deploy` predeploy (and on demand via
// `npm run build:assets`). Sources stay readable; HTML references the
// minified variants in production.

import { build } from 'esbuild';
import { stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const JS_SOURCES = [
  'js/app.js',
  'js/i18n.js',
  'js/cms.js',
  'js/auth.js',
  'js/auth-loader.js',
  'js/favourites.js',
  'js/packs.js',
  'js/profile.js',
  'js/perf.js',
  'js/sentry.js',
  'js/notifications.js',
  'js/sw-register.js',
  'js/map-init.js',
  'js/analytics.js',
];

const CSS_SOURCES = [
  'css/style.css',
  'css/map.css',
  'css/leaflet.css',
];

async function minifyJs(src) {
  const outfile = src.replace(/\.js$/, '.min.js');
  await build({
    absWorkingDir: PROJECT_ROOT,
    entryPoints: [src],
    outfile,
    minify: true,
    bundle: false,
    target: 'es2020',
    legalComments: 'none',
    sourcemap: false,
  });
  return outfile;
}

async function minifyCss(src) {
  const outfile = src.replace(/\.css$/, '.min.css');
  await build({
    absWorkingDir: PROJECT_ROOT,
    entryPoints: [src],
    outfile,
    minify: true,
    bundle: false,
    loader: { '.css': 'css' },
    legalComments: 'none',
    sourcemap: false,
  });
  return outfile;
}

async function reportSize(src, outfile) {
  const before = (await stat(join(PROJECT_ROOT, src))).size;
  const after = (await stat(join(PROJECT_ROOT, outfile))).size;
  const pct = Math.round((after / before) * 100);
  console.log(
    `  ${outfile.padEnd(32)}  ${String(Math.round(before / 1024)).padStart(4)}KB → ${String(Math.round(after / 1024)).padStart(4)}KB  (${pct}%)`
  );
}

console.log('Minifying JS…');
const jsResults = await Promise.all(JS_SOURCES.map(minifyJs));
for (let i = 0; i < JS_SOURCES.length; i++) await reportSize(JS_SOURCES[i], jsResults[i]);

console.log('Minifying CSS…');
const cssResults = await Promise.all(CSS_SOURCES.map(minifyCss));
for (let i = 0; i < CSS_SOURCES.length; i++) await reportSize(CSS_SOURCES[i], cssResults[i]);

console.log('Done.');
