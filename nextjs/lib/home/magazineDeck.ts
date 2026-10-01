/**
 * Keyframes for the magazine stack on the phone (MagazineGrid; from 768px
 * the table in magazineTable.ts takes over): one per cover and one per dot,
 * keyed to the deck's horizontal scroll timeline. At
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

/** Die Punkte unter dem Stapel schicken dieses Ereignis an den Querscroller.
 *  Ab 768px blättert dort lib/home/magazineTable und hält es an; am Telefon
 *  scrollen die Punkte selbst (MagazineDeckDots). */
export const DECK_GO_EVENT = 'magazine-deck-go';

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
