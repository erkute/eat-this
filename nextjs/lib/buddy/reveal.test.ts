// nextjs/lib/buddy/reveal.test.ts
import { describe, it, expect } from 'vitest';
import { revealStep, FRAME_MS, REVEAL_FLOOR_CPS } from './reveal';

/** Leert `chars` mit festem Takt `dtMs`; liefert die verstrichene Zeit in ms. */
function drainMs(chars: number, dtMs: number): number {
  let pending = chars;
  let ticks = 0;
  while (pending > 0 && ticks < 10000) {
    pending -= revealStep(pending, dtMs);
    ticks++;
  }
  if (pending > 0) throw new Error('läuft nicht leer');
  return ticks * dtMs;
}

describe('revealStep', () => {
  it('läuft bei kleinem Rückstand mit dem Boden von 60 Zeichen/s', () => {
    // Ein Bild bei 60 fps → ein Zeichen: klar schneller als man liest, aber
    // sichtbar als Fluss statt als Sprung.
    expect(revealStep(1, FRAME_MS)).toBe(1);
    expect(revealStep(5, FRAME_MS)).toBe(1);
    // Derselbe Boden über eine halbe Sekunde: 30 Zeichen.
    expect(revealStep(1000, 500)).toBeGreaterThanOrEqual((REVEAL_FLOOR_CPS * 500) / 1000);
  });

  it('holt bei großem Rückstand proportional auf, ohne Deckel', () => {
    // Ohne diese Beschleunigung liefe der Text dem Strom hinterher und tippte
    // nach dessen Ende noch sekundenlang weiter.
    const s50 = revealStep(50, FRAME_MS);
    const s1500 = revealStep(1500, FRAME_MS);
    expect(s50).toBeGreaterThanOrEqual(5);
    expect(s50).toBeLessThanOrEqual(6);
    expect(s1500).toBeGreaterThanOrEqual(150);
    expect(s1500).toBeLessThanOrEqual(152);
  });

  it('deckt nie mehr auf, als noch aussteht', () => {
    expect(revealStep(0, FRAME_MS)).toBe(0);
    expect(revealStep(-3, FRAME_MS)).toBe(0);
    expect(revealStep(3, FRAME_MS)).toBeLessThanOrEqual(3);
    expect(revealStep(3, 5000)).toBe(3);
  });

  it('zeigt bei reduzierter Bewegung und beim Abbruch sofort alles', () => {
    expect(revealStep(1200, FRAME_MS, true)).toBe(1200);
    expect(revealStep(0, FRAME_MS, true)).toBe(0);
  });

  it('zählt einen ungültigen oder fehlenden Takt als ein Bild', () => {
    // Neustart des Takts, erster Aufruf, NaN aus einer kaputten Uhr: nie ein
    // Sprung, nie ein Stillstand.
    expect(revealStep(50)).toBe(revealStep(50, FRAME_MS));
    expect(revealStep(50, 0)).toBe(revealStep(50, FRAME_MS));
    expect(revealStep(50, Number.NaN)).toBe(revealStep(50, FRAME_MS));
    expect(revealStep(50, -20)).toBe(revealStep(50, FRAME_MS));
  });

  /* Der Fund vom 09.09.2026 auf prod: die Seite lief mit 2 fps, die Antwort
     kroch 58 s, der Server war nach 12 s fertig. Die erste Fassung schrittete
     pro Bild — hier steht, dass die verstrichene ZEIT zählt: 60 fps, 20 fps
     und 2 fps müssen denselben Rückstand in etwa gleicher Zeit leeren. */
  it('leert denselben Rückstand bei 60, 20 und 2 fps in etwa gleicher Zeit', () => {
    const at60 = drainMs(4000, FRAME_MS);
    const at20 = drainMs(4000, 50);
    const at2 = drainMs(4000, 500);
    // Rund eine Sekunde für eine ganze Antwort, die auf einen Schlag da wäre.
    // Im Betrieb tritt das nicht auf: der Strom füllt den Puffer nach.
    expect(at60).toBeLessThan(1500);
    expect(at20).toBeLessThan(1500);
    // Bei 2 fps ist die Auflösung ein halbes Bild grob — drei Takte.
    expect(at2).toBeLessThanOrEqual(1500);
    expect(at2 / at60).toBeLessThan(2);
  });

  it('holt nach einem langen Takt (Hintergrund-Tab) in einem Schritt auf', () => {
    expect(revealStep(1400, 30000)).toBe(1400);
  });
});
