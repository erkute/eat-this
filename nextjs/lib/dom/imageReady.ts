/* Ein <img>, dessen `src` wechselt, zeigt das ALTE Bild weiter, bis das neue
   dekodiert ist — der Browser räumt den alten Rahmen nicht ab. Beim Blättern
   durch die Must Eats flog dadurch die nächste Karte mit dem Bild der vorigen
   herein, während Name und Restaurant darunter schon die neue Karte nannten
   (Nutzer, 12.09.2026: „da sehe ich beim Klick noch das gleiche Bild
   zweimal"). Gemessen: 880ms mit dem falschen Bild bei einem Bild, das 900ms
   braucht.

   Deshalb wartet der Kartentausch, bis das neue Bild wirklich zeichenbar ist.
   Der Deckel hält die Geste am Leben, wenn das Bild klemmt: dann blättert es
   trotzdem weiter — die Karte kommt leer herein und füllt sich, statt eine
   falsche zu zeigen. Wer dieses Versprechen einlöst, muss sein <img> pro
   Bild neu mounten (`key={src}`), sonst hängt der alte Rahmen wieder drin. */
export const IMAGE_READY_CAP_MS = 700;

/** Erfüllt sich, sobald `src` dekodiert im Speicher liegt — spätestens nach
 *  `capMs`. Ein bereits geladenes Bild löst noch im selben Microtask aus. */
export function whenImageReady(
  src: string | null | undefined,
  capMs: number = IMAGE_READY_CAP_MS
): Promise<void> {
  if (!src || typeof window === 'undefined') return Promise.resolve();
  const img = new window.Image();
  img.src = src;
  const loaded: Promise<void> = img.decode
    ? img.decode().then(
        () => undefined,
        () => undefined
      )
    : new Promise<void>((resolve) => {
        if (img.complete) return resolve();
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
  return Promise.race([loaded, new Promise<void>((resolve) => window.setTimeout(resolve, capMs))]);
}
