// nextjs/lib/buddy/reveal.ts
/**
 * Wie schnell Remys Antwort aufgedeckt wird.
 *
 * Der Anthropic-Strom liefert in Schüben: mal ein halber Satz auf einmal, dann
 * 200 ms nichts. Wer den Rohstrom direkt rendert, sieht die Antwort ruckweise
 * einrasten — „schnell und abgehackt". Deshalb kommt der Text nicht mehr aus
 * dem Netz auf den Schirm, sondern aus einem Puffer, den ein Takt gleichmäßig
 * leert.
 *
 * Der Schritt hängt an der VERSTRICHENEN ZEIT, nicht an der Bildanzahl. Die
 * erste Fassung (09.09.2026, bis Commit c059ffa) gab Zeichen pro Bild zurück —
 * bei 60 fps der gemessene stetige Fluss von ~210 Zeichen/s, aber auf prod in
 * einer Sitzung mit 2 fps (der Vorhang blurt die ganze Seite) kroch dieselbe
 * Antwort 58 s über den Schirm, während der Server nach 12 s fertig war. Ein
 * altes Telefon oder ein Hintergrund-Tab trifft dasselbe, nur milder.
 *
 * Das Tempo ist eine GEGLÄTTETE GESCHWINDIGKEIT, kein Anteil des Rückstands
 * mehr. Die zweite Fassung (bis 18.09.2026) deckte pro Takt `1 − e^(−dt/158 ms)`
 * des Rückstands auf. Der Strom kommt aber in Häppchen von 2–25 Zeichen alle
 * ~45 ms, mit Aussetzern von 100–500 ms dazwischen; der Puffer stand dabei bei
 * ~25 Zeichen, ein einzelnes Häppchen verdoppelte also das Tempo, und jeder
 * Aussetzer leerte ihn. Gemessen am aufgezeichneten Strom in 50-ms-Fenstern:
 * Schwankung (Variationskoeffizient) 0,45, Spitzen von 29 Zeichen, fünf
 * Stillstände. Das war das Ruckeln.
 *
 * Jetzt zwei Tiefpässe hintereinander:
 * - Zieltempo = Rückstand / τ, mit τ = 400 ms. Der Puffer pendelt sich bei
 *   ~60 Zeichen ein (zwei Drittel einer Zeile) und überbrückt die üblichen
 *   Aussetzer; großer Rückstand holt weiter proportional auf, OHNE Deckel —
 *   ein Schub von 1500 Zeichen wäre sonst ein Nachlauf, der nach dem Ende des
 *   Stroms weitertippt.
 * - Das gefahrene Tempo läuft dem Zieltempo mit τ = 200 ms nach. Ein Häppchen
 *   ändert das Tempo damit nur noch sacht, der Text fährt an und bremst, statt
 *   zu springen. Am selben Strom: Schwankung 0,26, Spitzen 12, ein Stillstand.
 * - Boden: 25 Zeichen/s, damit der letzte Rest nicht asymptotisch kriecht.
 * - Ist der Strom zu (`ended`), gilt τ = 160 ms und der höhere Deckel: der
 *   Rest kommt zügig, aber als Fluss — kein Absatz, der auf einen Schlag
 *   dasteht.
 *
 * Ein langer Takt (Tab war im Hintergrund, 2 fps) holt in einem Schritt alles
 * nach — der Schritt ist auf den Rückstand gedeckelt, nicht auf die Zeit.
 *
 * DECKEL (18.09.2026, „ist zu schnell"): der Strom kommt mit ~160 Zeichen/s,
 * das sind 25 Wörter pro Sekunde — sechsmal schneller, als man liest, und mit
 * dem Einblenden pro Wort ein Geflimmer. Im Fluss gilt jetzt höchstens
 * 100 Zeichen/s (~16 Wörter/s), nach Stromende 140 — mehr las sich im Test
 * als „jetzt rennt er plötzlich". Remy läuft damit dem Netz
 * hinterher; damit daraus kein langer Nachlauf wird, hebt jeder Rückstand
 * über 300 Zeichen den Deckel wieder an (0,5 Zeichen/s je Zeichen). Bei einer
 * üblichen Antwort (1300–1700 Zeichen) pendelt sich der Rückstand bei ~400
 * ein und ist 2–3 s nach Stromende aufgeholt; die Werkzeugpause mitten in der
 * Antwort leert ihn ohnehin. Ein 4000-Zeichen-Schub fährt mit ~2000 los.
 */
export const REVEAL_MAX_CPS = 100;
export const REVEAL_END_MAX_CPS = 140;
export const REVEAL_RELIEF_FROM = 300;
export const REVEAL_RELIEF_CPS_PER_CHAR = 0.5;
export const REVEAL_TAU_MS = 400;
export const REVEAL_PACE_TAU_MS = 200;
export const REVEAL_END_TAU_MS = 160;
export const REVEAL_FLOOR_CPS = 25;
/** Ein Bild bei 60 fps — was ein ungültiger Takt zählt. */
export const FRAME_MS = 1000 / 60;

/** Der Zustand des Takts: gefahrenes Tempo (Zeichen/s) und der Bruchteil
 *  eines Zeichens, der beim Abrunden übrig blieb. */
export interface RevealPace {
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
 * Die Aufdeck-Grenze um Remys App-Marker herumführen.
 *
 * `[[spot:<slug>]]` und `[[chips: a | b | c]]` sind Anweisungen an die App, auf
 * dem Schirm stehen sie nie. Solange der Takt sie Zeichen für Zeichen
 * „aufdeckte", stand der Text vor jeder Karte still (gemessen 18.09.2026:
 * 200–300 ms ohne ein neues Zeichen, vor den Chips am Ende bis zu 0,8 s), und
 * ein einzelnes `[` blitzte für ein Bild als eigener Absatz auf, bevor das
 * zweite kam und der Renderer den Anfang wieder versteckte (+34 px / −34 px).
 *
 * Deshalb: landet die Grenze in einem Marker, springt sie kostenlos hinter
 * ihn; ist er noch nicht ganz angekommen, wartet sie davor. `final` (Strom zu
 * Ende) lässt einen abgerissenen Marker durch — sonst liefe der Takt nie leer;
 * den hängenden Anfang versteckt `splitAnswerSegments`.
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
 * Die sichtbare Grenze auf eine Wortgrenze zurückziehen.
 *
 * Zeichenweise getippt wächst das letzte Wort der Zeile, bis es nicht mehr
 * passt, und hüpft dann als Ganzes in die nächste — das Auge liest den Anfang
 * des Wortes zweimal an zwei Orten. Chat-Oberflächen, wie man sie kennt,
 * setzen ganze Wörter. Das Tempo bleibt das von `revealStep`; nur die Stelle,
 * an der geschnitten wird, rastet ein.
 *
 * Am Ende des Puffers gilt das letzte Wort als unfertig (der Schub kann mitten
 * im Wort enden), außer der Strom ist zu (`final`).
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
 * Halbfertige Hervorhebung für die Anzeige schließen.
 *
 * `**Standard Pizza**` kommt über mehrere Wörter an. Bis das schließende `**`
 * da war, standen die Sternchen roh im Text, dann kippte die Zeile auf fett
 * und rückte um zwei Zeichen nach links. Jetzt ist das Wort vom ersten
 * Zeichen an fett: ein hängender Sternchen-Rest am Ende fällt weg (ein
 * Öffner ohne Inhalt oder ein halb angekommener Schließer), eine offene
 * Spanne wird geschlossen. Nur die letzte Zeile — Hervorhebung reicht bei
 * Remy nie über einen Zeilenwechsel, und `inlineMarkup` läse sie so auch
 * nicht. Ein Listenpunkt (`* `) am Zeilenanfang zählt nicht mit.
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
 * Wie weit der Log in diesem Takt nachrückt — die Feder aus
 * `use-stick-to-bottom` (StackBlitz; bolt.new, Vercel AI Elements), dem
 * De-facto-Standard fürs Mitscrollen in Chat-Oberflächen. Werte und Formel
 * sind übernommen, nicht nachempfunden:
 *
 *   velocity = (damping · velocity + stiffness · distance) / mass
 *   scrollTop += velocity · (dt / 16,67 ms)
 *
 * Der Unterschied zur Fassung davor (Abklingen mit τ = 110 ms): die Feder
 * STARTET MIT TEMPO NULL und nimmt Fahrt auf. Das Abklingen fuhr im ersten
 * Bild mit vollem Tempo los — bei einer Spot-Karte (250 px) über 2000 px/s aus
 * dem Stand, und genau das las sich als „kommt so plötzlich" (18.09.2026).
 * Eingeschwungen legt sie ~9 % des Abstands pro 60-fps-Bild zurück; weil der
 * Weg an der verstrichenen Zeit hängt, gilt das bei jeder Framerate.
 */
export const STICK_SPRING = { damping: 0.7, stiffness: 0.05, mass: 1.25 } as const;

export function stickStep(
  velocity: number,
  distance: number,
  dtMs: number = FRAME_MS
): { velocity: number; move: number } {
  const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : FRAME_MS;
  const v = (STICK_SPRING.damping * velocity + STICK_SPRING.stiffness * distance) / STICK_SPRING.mass;
  // Nie übers Ziel: ein langer Takt (2 fps, Hintergrund-Tab) landet genau unten.
  const move = distance > 0 ? Math.min(distance, (v * dt) / FRAME_MS) : distance;
  return { velocity: v, move };
}

/** `prefers-reduced-motion: reduce` — dann wird nicht getaktet. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
