/* Meldet `styles.foo`-Zugriffe ohne passende Klasse im Stylesheet.
 *
 *   npm run audit:css-modules
 *
 * Die Logik steckt in scripts/lib/css-module-classes.ts und laeuft zusaetzlich
 * bei jedem `npm test` (app/CssArchitecture.styles.test.ts) — dieses Skript ist
 * der Weg, den Fund im Klartext zu lesen.
 */
import { fileURLToPath } from 'node:url';
import { auditCssModules, formatFinding } from './lib/css-module-classes';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const findings = auditCssModules(rootDir);
const missing = findings.filter((finding) => finding.kind === 'missing');
const dynamic = findings.filter((finding) => finding.kind === 'dynamic');

for (const finding of missing) console.log(formatFinding(finding));

/* Kein Fehler, aber auch kein Freispruch: hier weiss nur die Laufzeit, welcher
   Schluessel gemeint ist. Steht darunter etwas, gehoert es von Hand geprueft. */
if (dynamic.length) {
  console.log(`\nNicht entscheidbar (${dynamic.length}):`);
  for (const finding of dynamic) console.log(`  ${formatFinding(finding)}`);
}

if (!missing.length) {
  console.log(
    dynamic.length ? '\nKeine toten CSS-Modul-Klassen.' : 'Keine toten CSS-Modul-Klassen.'
  );
  process.exit(0);
}

console.log(`\n${missing.length} tote Klasse(n).`);
process.exit(1);
