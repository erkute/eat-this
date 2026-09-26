/**
 * Die Flugbahn der Wortmarke aus dem Aufmacher in den Header — nur die
 * Rechnung, ohne DOM. `HeroMarkFlight` fliegt sie auf zwei Wegen: als native
 * Scroll-Timeline (Keyframes aus `flightKeyframes`) oder, wo es die nicht
 * gibt, Frame für Frame aus JS (`flightAt`). Beide lesen dieselbe Funktion,
 * damit sie nie auseinanderlaufen.
 */

export interface FlightGeo {
  /** Linke Kante der Marke im Aufmacher (Viewport). */
  startX: number;
  /** Oberkante der Marke im Aufmacher, bei Scrollposition 0. */
  startY: number;
  /** Logoplatz im Header — der ist fixed, also Viewport-Koordinaten. */
  endX: number;
  endY: number;
  /** Breite der Marke im Aufmacher; der Flieger trägt sie und skaliert. */
  startW: number;
  /** Headerbreite / Aufmacherbreite. */
  scale: number;
}

/* Sanft an beiden Enden. easeOutCubic war zu kopflastig: bei halbem Scrollweg
   stand die Marke schon zu 87 % oben und der Rest der Strecke passierte
   sichtbar nichts mehr. */
function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Lage des Fliegers bei Fortschritt `p` (0…1) über den Scrollweg `travel`. */
export function flightAt(geo: FlightGeo, p: number, travel: number) {
  const e = ease(p);
  // Blendet von „scrollt mit der Seite" nach „klebt im Header".
  const liveY = geo.startY - p * travel;
  return {
    x: geo.startX + (geo.endX - geo.startX) * e,
    y: liveY + (geo.endY - liveY) * e,
    scale: 1 + (geo.scale - 1) * e,
  };
}

export function flightTransform(geo: FlightGeo, p: number, travel: number): string {
  const { x, y, scale } = flightAt(geo, p, travel);
  return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
}

/* Die Bahn ist ein Produkt aus Scrollweg und Easing und lässt sich nicht als
   zwei Keyframes mit Timing-Funktion schreiben. 64 linear verbundene Stützen
   weichen auf dem Telefon nirgends mehr als einen Zehntelpixel davon ab
   (32 lagen bei 0,22px, der Fehler fällt mit dem Quadrat). */
const KEYFRAME_STEPS = 64;

/** Der Rumpf einer `@keyframes`-Regel, die dieselbe Bahn fliegt wie `flightAt`. */
export function flightKeyframes(geo: FlightGeo, travel: number): string {
  const frames: string[] = [];
  for (let i = 0; i <= KEYFRAME_STEPS; i += 1) {
    const p = i / KEYFRAME_STEPS;
    frames.push(`${(p * 100).toFixed(3)}%{transform:${flightTransform(geo, p, travel)}}`);
  }
  return frames.join('');
}
