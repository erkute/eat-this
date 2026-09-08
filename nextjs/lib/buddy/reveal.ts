// nextjs/lib/buddy/reveal.ts
/**
 * Wie schnell Remys Antwort aufgedeckt wird.
 *
 * Der Anthropic-Strom liefert in Schüben: mal ein halber Satz auf einmal, dann
 * 200 ms nichts. Wer den Rohstrom direkt rendert, sieht die Antwort ruckweise
 * einrasten — „schnell und abgehackt". Deshalb kommt der Text nicht mehr aus
 * dem Netz auf den Schirm, sondern aus einem Puffer, den ein Bild-für-Bild-
 * Takt gleichmäßig leert.
 *
 * Der Schritt wächst mit dem Rückstand, statt fest zu sein: Bei kleinem
 * Puffer läuft er mit einem Zeichen pro Bild (~60 Zeichen/s, klar schneller
 * als man liest, aber sichtbar als Fluss), bei großem Rückstand holt er
 * proportional auf. Das pendelt sich von selbst ein — der Puffer bleibt rund
 * ein Sechstel der Erzeugungsrate groß (bei ~300 Zeichen/s also ~50 Zeichen,
 * eine halbe Zeile) und ist am Ende des Stroms in ein paar Bildern leer.
 * Die Antwort dauert dadurch nicht länger, sie kommt nur nicht mehr in
 * Sprüngen.
 *
 * Bewusst KEINE Obergrenze: ein Schub von 1500 Zeichen (Fehlertext, sehr
 * schnelles Modell) wäre sonst ein langer Nachlauf, der nach dem Ende des
 * Stroms noch weitertippt.
 */
export const REVEAL_DIVISOR = 10;

/**
 * Zeichen, die dieses Bild dazukommen.
 *
 * @param pending noch nicht aufgedeckte Zeichen
 * @param instant Sofort alles zeigen — bei `prefers-reduced-motion: reduce`
 *   und beim Abbruch, wo das schon Empfangene ohne Nachlauf stehen soll.
 */
export function revealStep(pending: number, instant = false): number {
  if (pending <= 0) return 0;
  if (instant) return pending;
  return Math.max(1, Math.ceil(pending / REVEAL_DIVISOR));
}

/** `prefers-reduced-motion: reduce` — dann wird nicht getaktet. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
