/* Der Kartenwechsel im Must-Eat-Detail und in seinem Zoom: die liegende Karte
   fliegt schräg zur Seite weg, die nächste kommt aus der Gegenrichtung
   herein — und zwar GLEICHZEITIG. Bis 27.10.2026 lief beides nacheinander:
   erst flog die alte Karte ganz hinaus, dann lag kurz nur der leere Stapel
   (im Zoom: der leere Vorhang) da, dann kam die neue (Betreiber: „zu abrupt,
   ich will sehen, wie die eine wegfliegt und die nächste hereinkommt").

   Detail (WAAPI) und Zoom (framer-motion) teilen sich diese Zahlen, damit
   derselbe Wisch sich in beiden gleich anfühlt. Die Einfahrt startet einen
   Hauch später: so schiebt die neue Karte die alte nicht, sondern folgt ihr. */

export const DEAL_OUT_MS = 340;
export const DEAL_IN_MS = 480;
export const DEAL_IN_DELAY_MS = 60;
/** Schneller Start — die Karte nimmt den Schwung des Fingers mit. */
export const DEAL_OUT_EASE = [0.3, 0.5, 0.6, 1] as const;
/** Leichter Überschwung beim Landen (y > 1 im zweiten Griff). Bewusst keine
 *  Feder: Federn erben die Geschwindigkeit der vorigen Animation. */
export const DEAL_IN_EASE = [0.17, 1.06, 0.34, 1] as const;
/** Neigung der fliegenden Karte, in Grad. */
export const DEAL_TILT_DEG = 10;

export const cssEase = (ease: readonly number[]) => `cubic-bezier(${ease.join(', ')})`;
