// nextjs/lib/buddy/reveal.test.ts
import { describe, it, expect } from 'vitest';
import {
  revealStep,
  newRevealPace,
  skipMarker,
  snapToWord,
  closeOpenEmphasis,
  followStep,
  FRAME_MS,
} from './reveal';

/** Leert `chars` mit festem Takt `dtMs`; liefert die verstrichene Zeit in ms. */
function drainMs(chars: number, dtMs: number, mode: 'flow' | 'ended' = 'ended'): number {
  const pace = newRevealPace();
  let pending = chars;
  let ticks = 0;
  while (pending > 0 && ticks < 100000) {
    pending -= revealStep(pending, dtMs, pace, mode);
    ticks++;
  }
  if (pending > 0) throw new Error('läuft nicht leer');
  return ticks * dtMs;
}

/** Ein gleichmäßiger Strom von `cps` Zeichen/s in Häppchen alle `everyMs`;
 *  liefert die aufgedeckten Zeichen je 50-ms-Fenster, ohne den Anlauf. */
function flowWindows(cps: number, everyMs: number, gapAt?: [number, number]): number[] {
  const pace = newRevealPace();
  let raw = 0;
  let revealed = 0;
  let nextChunk = 0;
  const windows: number[] = [];
  for (let t = 0; t < 6000; t += FRAME_MS) {
    while (nextChunk <= t) {
      const inGap = gapAt && nextChunk >= gapAt[0] && nextChunk < gapAt[1];
      if (!inGap) raw += (cps * everyMs) / 1000;
      nextChunk += everyMs;
    }
    const step = revealStep(Math.floor(raw) - revealed, FRAME_MS, pace);
    revealed += step;
    const k = Math.floor(t / 50);
    windows[k] = (windows[k] ?? 0) + step;
  }
  return windows.slice(30); // die ersten 1,5 s sind Anfahren
}

describe('revealStep', () => {
  it('fährt an, statt loszuspringen', () => {
    // 60 Zeichen auf einen Schlag: das erste Bild zeigt davon fast nichts,
    // das Tempo baut sich über ~200 ms auf.
    const pace = newRevealPace();
    expect(revealStep(60, FRAME_MS, pace)).toBeLessThanOrEqual(1);
    let got = 0;
    for (let i = 0; i < 12; i++) got += revealStep(60 - got, FRAME_MS, pace);
    expect(got).toBeGreaterThan(5);
    expect(got).toBeLessThan(30);
  });

  it('läuft bei gleichmäßigem Strom gleichmäßig — Häppchen schlagen nicht durch', () => {
    // 160 Zeichen/s in Häppchen alle 45 ms: das gemessene Profil vom 18.09.2026.
    const w = flowWindows(160, 45);
    const mean = w.reduce((a, b) => a + b, 0) / w.length;
    expect(mean).toBeGreaterThan(7.5);
    expect(mean).toBeLessThan(8.5);
    // 8 je Fenster; ±3 ist die Fensterkante (mal drei, mal vier Bilder).
    expect(Math.max(...w)).toBeLessThanOrEqual(11);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(5);
  });

  it('überbrückt einen Aussetzer von 300 ms ohne Stillstand', () => {
    const w = flowWindows(160, 45, [3000, 3300]);
    expect(Math.min(...w)).toBeGreaterThan(0);
  });

  it('deckt nie mehr auf, als noch aussteht', () => {
    const pace = newRevealPace();
    expect(revealStep(0, FRAME_MS, pace)).toBe(0);
    expect(revealStep(-3, FRAME_MS, pace)).toBe(0);
    expect(revealStep(3, 5000, pace)).toBe(3);
  });

  it('zeigt bei reduzierter Bewegung und beim Abbruch sofort alles', () => {
    expect(revealStep(1200, FRAME_MS, newRevealPace(), 'instant')).toBe(1200);
    expect(revealStep(0, FRAME_MS, newRevealPace(), 'instant')).toBe(0);
  });

  it('zählt einen ungültigen Takt als ein Bild', () => {
    // Neustart des Takts, NaN aus einer kaputten Uhr: nie ein Sprung.
    const ref = revealStep(500, FRAME_MS, newRevealPace(), 'ended');
    expect(revealStep(500, 0, newRevealPace(), 'ended')).toBe(ref);
    expect(revealStep(500, Number.NaN, newRevealPace(), 'ended')).toBe(ref);
    expect(revealStep(500, -20, newRevealPace(), 'ended')).toBe(ref);
  });

  it('räumt nach dem Ende des Stroms zügig ab', () => {
    // Der übliche Rest (~60 Zeichen Puffer) steht in einer halben Sekunde da —
    // Chips und Pack-Karte hängen an diesem Moment.
    expect(drainMs(60, FRAME_MS)).toBeLessThan(600);
    // Im Fluss dagegen dürfte derselbe Rest sich Zeit lassen.
    expect(drainMs(60, FRAME_MS, 'flow')).toBeGreaterThan(drainMs(60, FRAME_MS));
  });

  /* Der Fund vom 09.09.2026 auf prod: die Seite lief mit 2 fps, die Antwort
     kroch 58 s, der Server war nach 12 s fertig. Die erste Fassung schrittete
     pro Bild — hier steht, dass die verstrichene ZEIT zählt: 60 fps, 20 fps
     und 2 fps müssen denselben Rückstand in etwa gleicher Zeit leeren. */
  it('leert denselben Rückstand bei 60, 20 und 2 fps in etwa gleicher Zeit', () => {
    const at60 = drainMs(4000, FRAME_MS);
    const at20 = drainMs(4000, 50);
    const at2 = drainMs(4000, 500);
    expect(at60).toBeLessThan(1500);
    expect(at20).toBeLessThan(1500);
    expect(at2).toBeLessThanOrEqual(1500);
    // Bei 2 fps ist die Auflösung ein halbes Bild grob — ein Takt Spiel.
    expect(at2 - at60).toBeLessThanOrEqual(500);
  });

  it('holt nach einem langen Takt (Hintergrund-Tab) in einem Schritt auf', () => {
    expect(revealStep(1400, 30000, newRevealPace())).toBe(1400);
  });
});

describe('skipMarker', () => {
  const raw = 'Geh zu Zola.\n\n[[spot:zola]]\n\nUnd dann';
  const open = raw.indexOf('[[');
  const end = raw.indexOf(']]') + 2;

  it('lässt die Grenze außerhalb eines Markers, wo sie ist', () => {
    expect(skipMarker(raw, 5)).toBe(5);
    expect(skipMarker(raw, open)).toBe(open);
    expect(skipMarker(raw, end + 3)).toBe(end + 3);
  });

  it('springt kostenlos hinter einen vollständigen Marker', () => {
    // Vorher fraß jeder Marker 15–50 Zeichen Tippzeit: der Text stand still.
    expect(skipMarker(raw, open + 1)).toBe(end);
    expect(skipMarker(raw, end - 1)).toBe(end);
  });

  it('wartet vor einem Marker, der noch nicht ganz da ist', () => {
    const partial = raw.slice(0, open + 8);
    expect(skipMarker(partial, open + 1)).toBe(open);
    expect(skipMarker(partial, partial.length)).toBe(open);
  });

  it('lässt am Stromende einen abgerissenen Marker durch, damit der Takt leerläuft', () => {
    const partial = raw.slice(0, open + 8);
    expect(skipMarker(partial, partial.length, true)).toBe(partial.length);
  });
});

describe('snapToWord', () => {
  it('zieht die Grenze auf den Anfang des angefangenen Wortes zurück', () => {
    const raw = 'Die beste Pizza der Stadt';
    expect(snapToWord(raw, 12)).toBe(10); // mitten in „Pizza"
    expect(snapToWord(raw, 9)).toBe(9); // genau vor dem Leerzeichen
  });

  it('hält das letzte Wort des Puffers zurück, bis der Strom zu ist', () => {
    const raw = 'Die beste Piz';
    expect(snapToWord(raw, raw.length)).toBe(10);
    expect(snapToWord(raw, raw.length, true)).toBe(raw.length);
  });

  it('hält ein einzelnes „[" zurück — es blitzte als eigener Absatz auf', () => {
    const raw = 'Geh zu Zola.\n\n[';
    expect(snapToWord(raw, raw.length)).toBe(raw.length - 1);
  });

  it('nimmt das Ende eines Markers als Grenze', () => {
    const raw = 'Geh hin.\n\n[[spot:zola]]';
    expect(snapToWord(raw, raw.length)).toBe(raw.length);
  });

  it('wartet nicht auf das Ende eines Bandwurms', () => {
    const raw = 'x'.repeat(80);
    expect(snapToWord(raw, 50)).toBe(50);
  });
});

describe('closeOpenEmphasis', () => {
  it('schließt eine offene fette oder kursive Spanne', () => {
    expect(closeOpenEmphasis('Nimm die **Standard')).toBe('Nimm die **Standard**');
    expect(closeOpenEmphasis('eigentlich *die')).toBe('eigentlich *die*');
  });

  it('wirft hängende Sternchen am Ende weg', () => {
    expect(closeOpenEmphasis('Nimm die **')).toBe('Nimm die ');
    expect(closeOpenEmphasis('Nimm die **Standard*')).toBe('Nimm die **Standard**');
  });

  it('lässt fertige Zeilen, frühere Zeilen und Listenpunkte in Ruhe', () => {
    expect(closeOpenEmphasis('Die **Pizza** ist gut')).toBe('Die **Pizza** ist gut');
    expect(closeOpenEmphasis('**offen\nneue Zeile')).toBe('**offen\nneue Zeile');
    expect(closeOpenEmphasis('* Punkt eins')).toBe('* Punkt eins');
    expect(closeOpenEmphasis('* Punkt **eins')).toBe('* Punkt **eins**');
  });
});

describe('followStep', () => {
  it('zieht eine Karte (260 px) in unter einer halben Sekunde nach, ohne Sprung', () => {
    let d = 260;
    let ms = 0;
    let biggest = 0;
    while (d > 0.5 && ms < 5000) {
      const s = followStep(d, FRAME_MS);
      biggest = Math.max(biggest, s);
      d -= s;
      ms += FRAME_MS;
    }
    expect(ms).toBeLessThan(500);
    expect(biggest).toBeLessThan(40);
  });

  it('schießt nie über das Ziel und korrigiert einen Überstand in einem Schritt', () => {
    expect(followStep(3, 1000)).toBe(3);
    expect(followStep(-34, FRAME_MS)).toBe(-34);
  });
});
