/**
 * Wie schnell Remys Antwort aufgedeckt wird.
 *
 * Der Anthropic-Strom kommt in Schüben (Häppchen alle ~45 ms, Aussetzer bis 500
 * ms). Damit die Antwort nicht ruckweise einrastet, leert ein Takt einen Puffer
 * gleichmäßig. Der Schritt hängt an der verstrichenen Zeit, nicht an der
 * Bildanzahl, sonst kröche die Antwort bei 2 fps (Vorhang-Blur,
 * Hintergrund-Tab) weit über das Stromende hinaus.
 *
 * Zwei Tiefpässe hintereinander:
 * - Zieltempo = Rückstand / τ (400 ms): der Puffer überbrückt die üblichen
 *   Aussetzer, großer Rückstand holt proportional auf.
 * - Das gefahrene Tempo folgt dem Zieltempo mit τ = 200 ms, damit ein
 *   Häppchen das Tempo nur sacht ändert.
 * - Boden 25 Zeichen/s, damit der Rest nicht asymptotisch kriecht.
 * - Nach Stromende (`ended`) τ = 160 ms und der höhere Deckel.
 *
 * Ein langer Takt holt in einem Schritt alles nach; der Schritt ist auf den
 * Rückstand gedeckelt, nicht auf die Zeit.
 *
 * Deckel: höchstens 100 Zeichen/s im Fluss (~16 Wörter/s), 140 nach Stromende;
 * schneller liest sich als Rennen. Jeder Rückstand über 300 Zeichen hebt den
 * Deckel an (0,5 Zeichen/s je Zeichen), damit kein langer Nachlauf entsteht.
 */
const REVEAL_MAX_CPS = 100;
const REVEAL_END_MAX_CPS = 140;
const REVEAL_RELIEF_FROM = 300;
const REVEAL_RELIEF_CPS_PER_CHAR = 0.5;
const REVEAL_TAU_MS = 400;
const REVEAL_PACE_TAU_MS = 200;
const REVEAL_END_TAU_MS = 160;
const REVEAL_FLOOR_CPS = 25;
/** Ein Bild bei 60 fps — was ein ungültiger Takt zählt. */
export const FRAME_MS = 1000 / 60;

/** Der Zustand des Takts: gefahrenes Tempo (Zeichen/s) und der Bruchteil
 *  eines Zeichens, der beim Abrunden übrig blieb. */
interface RevealPace {
  v: number;
  carry: number;
}

export function newRevealPace(): RevealPace {
  return { v: 0, carry: 0 };
}

/**
 * Zeichen, die in diesem Takt dazukommen. Schreibt `pace` fort.
 *
 * @param pending noch nicht aufgedeckte Zeichen
 * @param dtMs seit dem letzten Takt verstrichene Zeit; ungültig oder ≤ 0
 *   zählt als ein Bild (Neustart des Takts, erster Aufruf)
 * @param mode `ended`: der Strom ist zu, der Rest kommt zügig. `instant`:
 *   sofort alles — bei `prefers-reduced-motion: reduce` und beim Abbruch, wo
 *   das schon Empfangene ohne Nachlauf stehen soll.
 */
export function revealStep(
  pending: number,
  dtMs: number,
  pace: RevealPace,
  mode: 'flow' | 'ended' | 'instant' = 'flow'
): number {
  const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : FRAME_MS;
  if (pending <= 0 || mode === 'instant') {
    // Leerer Puffer: das Tempo klingt aus, statt beim nächsten Häppchen mit
    // dem alten Schwung loszurennen.
    pace.v *= Math.exp(-dt / REVEAL_PACE_TAU_MS);
    pace.carry = 0;
    return Math.max(0, pending);
  }
  const tau = mode === 'ended' ? REVEAL_END_TAU_MS : REVEAL_TAU_MS;
  const cap =
    (mode === 'ended' ? REVEAL_END_MAX_CPS : REVEAL_MAX_CPS) +
    Math.max(0, pending - REVEAL_RELIEF_FROM) * REVEAL_RELIEF_CPS_PER_CHAR;
  const target = Math.min(Math.max(pending / (tau / 1000), REVEAL_FLOOR_CPS), cap);
  pace.v += (target - pace.v) * (1 - Math.exp(-dt / REVEAL_PACE_TAU_MS));
  const exact = (pace.v * dt) / 1000 + pace.carry;
  const step = Math.min(pending, Math.floor(exact + 1e-9));
  pace.carry = step >= pending ? 0 : exact - step;
  return step;
}

/**
 * Die Aufdeck-Grenze um Remys App-Marker (`[[spot:<slug>]]`, `[[chips: …]]`)
 * herumführen. Sie stehen nie auf dem Schirm; zeichenweise aufgedeckt stünde
 * der Text vor jeder Karte still, und ein einzelnes `[` blitzte auf.
 *
 * Landet die Grenze in einem Marker, springt sie hinter ihn; ist er
 * unvollständig, wartet sie davor. `final` lässt einen abgerissenen Marker
 * durch, sonst liefe der Takt nie leer; den hängenden Anfang versteckt
 * `splitAnswerSegments`.
 */
export function skipMarker(raw: string, pos: number, final = false): number {
  if (pos <= 0) return 0;
  if (pos >= raw.length) pos = raw.length;
  const open = raw.lastIndexOf('[[', pos - 1);
  if (open === -1) return pos;
  const close = raw.indexOf(']]', open + 2);
  if (close === -1) return final ? pos : open;
  return pos < close + 2 ? close + 2 : pos;
}

/** Ab dieser Länge ist ein „Wort" keins mehr (URL, Bandwurm) — dann wird
 *  doch mitten hinein aufgedeckt, statt auf sein Ende zu warten. */
const MAX_WORD = 32;

/**
 * Die sichtbare Grenze auf eine Wortgrenze zurückziehen, damit kein halbes Wort
 * am Zeilenende wächst und dann umbricht. Das Tempo bleibt das von
 * `revealStep`.
 *
 * Am Pufferende gilt das letzte Wort als unfertig, außer der Strom ist zu
 * (`final`).
 */
export function snapToWord(raw: string, pos: number, final = false): number {
  if (pos >= raw.length) {
    if (final) return raw.length;
    pos = raw.length;
  } else if (/\s/.test(raw[pos])) {
    return pos;
  }
  // Direkt hinter einem Marker ist immer eine Grenze — sonst wartete die
  // Karte auf das nächste Wort, das nach ihr kommt.
  if (raw.endsWith(']]', pos)) return pos;
  let i = pos;
  while (i > 0 && !/\s/.test(raw[i - 1])) i--;
  return pos - i > MAX_WORD ? pos : i;
}

/**
 * Halbfertige Hervorhebung für die Anzeige schließen, damit `**Wort**` vom
 * ersten Zeichen an fett steht und die Zeile nicht springt. Ein hängender
 * Sternchen-Rest am Ende fällt weg, eine offene Spanne wird geschlossen. Nur
 * die letzte Zeile: Hervorhebung reicht bei Remy nie über einen Zeilenwechsel.
 * Ein Listenpunkt (`* `) zählt nicht mit.
 */
export function closeOpenEmphasis(text: string): string {
  const nl = text.lastIndexOf('\n') + 1;
  const head = text.slice(0, nl);
  let line = text.slice(nl).replace(/\*+$/, '');
  const body = line.replace(/^\s*\*\s/, '');
  const doubles = (body.match(/\*\*/g) ?? []).length;
  const singles = (body.replace(/\*\*/g, '').match(/\*/g) ?? []).length;
  // Erst die innere (kursive), dann die äußere (fette) Spanne schließen.
  if (singles % 2 === 1) line += '*';
  if (doubles % 2 === 1) line += '**';
  return head + line;
}

/**
 * Wie weit der Log in diesem Takt nachrückt: die Feder aus
 * `use-stick-to-bottom`, Werte und Formel übernommen:
 *
 *   velocity = (damping · velocity + stiffness · distance) / mass
 *   scrollTop += velocity · (dt / 16,67 ms)
 *
 * Sie startet mit Tempo null; ein Abklingen spränge bei einer Spot-Karte aus
 * dem Stand los. Der Weg hängt an der verstrichenen Zeit, gilt also bei jeder
 * Framerate.
 */
const STICK_SPRING = { damping: 0.7, stiffness: 0.05, mass: 1.25 } as const;

export function stickStep(
  velocity: number,
  distance: number,
  dtMs: number = FRAME_MS
): { velocity: number; move: number } {
  const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : FRAME_MS;
  const v =
    (STICK_SPRING.damping * velocity + STICK_SPRING.stiffness * distance) / STICK_SPRING.mass;
  // Nie übers Ziel: ein langer Takt (2 fps, Hintergrund-Tab) landet genau unten.
  const move = distance > 0 ? Math.min(distance, (v * dt) / FRAME_MS) : distance;
  return { velocity: v, move };
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
