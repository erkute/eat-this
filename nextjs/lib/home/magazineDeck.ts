/**
 * Keyframes for the magazine stack on the home page (MagazineGrid): one per
 * cover and one per dot, keyed to the deck's horizontal scroll timeline. At
 * every snap point k (k / (count - 1) of the way) cover i lies at depth
 * i - k: under 0 it has been dealt off to the left, 0 is on top, above that
 * it waits in the pile — raised a little, smaller, turned a little, so the
 * edges show like magazines on a table. Beyond depth 3 the covers lie exactly
 * under the third and stay out of sight. Between snap points everything
 * interpolates, so a swipe moves the stack continuously.
 *
 * Every cover lies in the deck's first column and is carried back by exactly
 * the distance scrolled (`k * 100cqw` — one column per snap point), so the
 * stack stays put without `position: sticky`: iOS 27 Safari tints its URL bar
 * after anything sticky that touches the bottom edge.
 */

const PEEK = 16; // px each layer rises above the one in front
const SHRINK = 0.055;
const TURN = [0, 2.4, -2, 3]; // deg per layer
const DEPTH = TURN.length - 1;

/** One transform list, same functions at every depth, so all of them
 *  interpolate into each other. */
export function deckPose(depth: number): string {
  // Far enough that the turned card's lower corner clears the screen edge
  // too (at -128% it still poked in on a 402pt iPhone).
  if (depth < 0) return 'translate(-165%, 5%) rotate(-14deg) scale(1)';
  const d = Math.min(depth, DEPTH);
  const scale = Math.round((1 - SHRINK * d) * 1000) / 1000;
  return `translate(0%, ${-PEEK * d}px) rotate(${TURN[d]}deg) scale(${scale})`;
}

/* ── Desktop: der Stapel auf dem Tisch ──
   Ab 768px liegen die Hefte als Fächer nach links aufgeblättert — zur
   Überschrift hin, so zeigt jedes dahinter den Anfang seiner Schlagzeile.
   Wer weiterblättert, wirft das oberste wie am Telefon nach links aus dem
   Bild; der Tisch reicht dafür von Fensterrand zu Fensterrand, keine Kante
   schneidet es ab. Hinten im Fächer taucht dabei das nächste auf: der
   Stapel ist ein Ring, das geworfene liegt unsichtbar unter dem letzten im
   Fächer und rückt von dort nach. Verworfen (01.10.2026, „verschwinden
   einfach, total billig"): das oberste unter den Stapel schieben — in der
   Mitte des Wegs sprang es hinter die anderen. Wie weit der Fächer aufgeht
   und wie weit geworfen wird, steht in CSS-Variablen (`--fan-x/-y/-r`,
   `--throw`, MagazineGrid.module.css), damit die Maus aufblättern kann,
   ohne die Schlüsselbilder neu zu schreiben. */

const FAN = 4; // so many covers fan out behind the front one
const FAN_SHRINK = 0.04;
/** Where a dealt cover lands: thrown off to the left, past the window's
 *  edge (`--throw` is measured from the pile to beyond the edge). */
const THROWN = 'translate(calc(-1 * var(--throw)), 4%) rotate(-16deg) scale(1)';

/** One pose on the table, `depth` ≥ 0 places behind the front cover. */
export function tablePose(depth: number): string {
  const d = Math.min(Math.max(depth, 0), FAN);
  const scale = Math.round((1 - FAN_SHRINK * d) * 1000) / 1000;
  return `translate(calc(${d} * var(--fan-x)), calc(${d} * var(--fan-y))) rotate(calc(${d} * var(--fan-r))) scale(${scale})`;
}

export function tableKeyframes(count: number): string {
  if (count < 2) return '';
  const span = count - 1;
  const at = (k: number) => Math.round((k / span) * 10000) / 100;
  const carry = (k: number) => `translate(calc(${k} * 100cqw), 0px)`;
  const frame = (pct: number, k: number, pose: string, z: number) =>
    `${pct}%{transform:${carry(k)} ${pose};z-index:${z}}`;
  return Array.from({ length: count }, (_, i) => {
    const frames: string[] = [];
    for (let k = 0; k < count; k++) {
      const depth = (((i - k) % count) + count) % count;
      frames.push(frame(at(k), k, tablePose(depth), count - Math.min(depth, FAN + 1)));
      // Dealt from the top: thrown off to the left, out of the picture;
      // right at the next point it lies hidden under the end of the fan.
      if (depth === 0 && k < span) {
        const landed = Math.round((at(k + 1) - 0.01) * 100) / 100;
        frames.push(frame(landed, k + 1, THROWN, count + 1));
      }
    }
    return `@keyframes mag-table-${count}-${i}{${frames.join('')}}`;
  }).join('');
}

export function deckKeyframes(count: number): string {
  if (count < 2) return '';
  const at = (k: number) => `${Math.round((k / (count - 1)) * 10000) / 100}%`;
  const steps = Array.from({ length: count }, (_, k) => k);
  const covers = steps.map(
    (i) =>
      `@keyframes mag-deck-${count}-${i}{${steps
        .map((k) => `${at(k)}{transform:translate(calc(${k} * 100cqw), 0px) ${deckPose(i - k)}}`)
        .join('')}}`
  );
  const dots = steps.map(
    (n) =>
      `@keyframes mag-dot-${count}-${n}{${steps
        .map((k) =>
          k === n
            ? `${at(k)}{background-color:var(--et-accent);transform:scaleX(2.4)}`
            : `${at(k)}{background-color:rgba(255,255,255,0.3);transform:scaleX(1)}`
        )
        .join('')}}`
  );
  return [...covers, ...dots].join('');
}
