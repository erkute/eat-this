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
 * Zwei Anteile, der größere gewinnt:
 * - Abklingen: pro Takt der Anteil `1 − e^(−dt/τ)` des Rückstands. τ = 158 ms
 *   ist genau das alte „ein Zehntel pro Bild" bei 60 fps, nur in Zeit
 *   ausgedrückt. Großer Rückstand holt proportional auf, der Puffer pendelt
 *   sich bei ~50 Zeichen ein (eine halbe Zeile) und ist am Ende des Stroms in
 *   ein paar Takten leer.
 * - Boden: 60 Zeichen/s — das alte „ein Zeichen pro Bild". Klar schneller als
 *   man liest, aber sichtbar als Fluss statt als Sprung.
 *
 * Bewusst KEINE Obergrenze: ein Schub von 1500 Zeichen (Fehlertext, sehr
 * schnelles Modell) wäre sonst ein Nachlauf, der nach dem Ende des Stroms noch
 * weitertippt. Und ein langer Takt (Tab war im Hintergrund) holt in einem
 * Schritt alles nach — das ist richtig so, nicht ein Fehler.
 */
export const REVEAL_TAU_MS = 158;
export const REVEAL_FLOOR_CPS = 60;
/** Ein Bild bei 60 fps — der Takt, an dem die Werte oben geeicht sind. */
export const FRAME_MS = 1000 / 60;

/**
 * Zeichen, die in diesem Takt dazukommen.
 *
 * @param pending noch nicht aufgedeckte Zeichen
 * @param dtMs seit dem letzten Takt verstrichene Zeit; ungültig oder ≤ 0
 *   zählt als ein Bild (Neustart des Takts, erster Aufruf)
 * @param instant Sofort alles zeigen — bei `prefers-reduced-motion: reduce`
 *   und beim Abbruch, wo das schon Empfangene ohne Nachlauf stehen soll.
 */
export function revealStep(pending: number, dtMs: number = FRAME_MS, instant = false): number {
  if (pending <= 0) return 0;
  if (instant) return pending;
  const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : FRAME_MS;
  const decay = pending * (1 - Math.exp(-dt / REVEAL_TAU_MS));
  const floor = (REVEAL_FLOOR_CPS * dt) / 1000;
  // −1e-6 vor dem Aufrunden: 60 × 16,666… / 1000 ergibt in Fließkomma
  // 1,0000000000000002, und ceil machte daraus 2 — doppeltes Tempo aus
  // einem Rundungsrest. Ein Millionstel Zeichen ist kein Zeichen.
  return Math.min(pending, Math.max(1, Math.ceil(Math.max(decay, floor) - 1e-6)));
}

/** `prefers-reduced-motion: reduce` — dann wird nicht getaktet. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
