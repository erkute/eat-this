// nextjs/lib/buddy/reveal.test.ts
import { describe, it, expect } from 'vitest';
import { revealStep, REVEAL_DIVISOR } from './reveal';

describe('revealStep', () => {
  it('deckt bei kleinem Rückstand ein Zeichen pro Bild auf', () => {
    // ~60 Zeichen/s bei 60 fps: klar schneller als man liest, aber sichtbar
    // als Fluss statt als Sprung.
    expect(revealStep(1)).toBe(1);
    expect(revealStep(REVEAL_DIVISOR)).toBe(1);
  });

  it('holt proportional auf, ohne Deckel', () => {
    // Ohne diese Beschleunigung liefe der Text dem Strom hinterher und tippte
    // nach dessen Ende noch sekundenlang weiter.
    expect(revealStep(50)).toBe(5);
    expect(revealStep(1500)).toBe(150);
  });

  it('deckt nie mehr auf, als noch aussteht', () => {
    expect(revealStep(0)).toBe(0);
    expect(revealStep(-3)).toBe(0);
    expect(revealStep(3)).toBeLessThanOrEqual(3);
  });

  it('zeigt bei reduzierter Bewegung und beim Abbruch sofort alles', () => {
    expect(revealStep(1200, true)).toBe(1200);
    expect(revealStep(0, true)).toBe(0);
  });

  it('läuft von jedem Rückstand aus in endlich vielen Bildern leer', () => {
    let pending = 4000;
    let frames = 0;
    while (pending > 0 && frames < 1000) {
      pending -= revealStep(pending);
      frames++;
    }
    expect(pending).toBe(0);
    // Rund eine Sekunde für eine ganze Antwort, die auf einen Schlag da wäre
    // (63 Bilder für 4000 Zeichen). Im Betrieb tritt das nicht auf: der Strom
    // füllt den Puffer nach, der Rückstand bleibt bei ~50 Zeichen.
    expect(frames).toBeLessThan(80);
  });
});
