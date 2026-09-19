import { describe, expect, it } from 'vitest';
import { flightAt, flightKeyframes, flightTransform, type FlightGeo } from './heroMarkFlight';

// iPhone 390 breit: Marke 240px mittig im Aufmacher, Logoplatz ~101px im Header.
const PHONE: FlightGeo = {
  startX: 75,
  startY: 137,
  endX: 144.5,
  endY: 58,
  startW: 240,
  scale: 101 / 240,
};
const TRAVEL = 240;

function parse(css: string) {
  return [
    ...css.matchAll(
      /([\d.]+)%\{transform:translate3d\(([-\d.]+)px, ([-\d.]+)px, 0\) scale\(([\d.]+)\)\}/g
    ),
  ].map((m) => ({ p: Number(m[1]) / 100, x: Number(m[2]), y: Number(m[3]), scale: Number(m[4]) }));
}

describe('Flugbahn der Wortmarke', () => {
  it('startet auf der Marke im Aufmacher und landet auf dem Logoplatz', () => {
    expect(flightAt(PHONE, 0, TRAVEL)).toEqual({ x: 75, y: 137, scale: 1 });
    const end = flightAt(PHONE, 1, TRAVEL);
    expect(end.x).toBeCloseTo(144.5);
    expect(end.y).toBeCloseTo(58);
    expect(end.scale).toBeCloseTo(101 / 240);
  });

  it('folgt am Anfang der Seite: ein Pixel Scrollen ist ein Pixel nach oben', () => {
    const a = flightAt(PHONE, 0, TRAVEL);
    const b = flightAt(PHONE, 2 / TRAVEL, TRAVEL);
    expect(a.y - b.y).toBeCloseTo(2, 2);
  });

  it('die Keyframes beginnen bei 0 %, enden bei 100 % und tragen die JS-Werte', () => {
    const frames = parse(flightKeyframes(PHONE, TRAVEL));
    expect(frames[0].p).toBe(0);
    expect(frames.at(-1)?.p).toBe(1);
    // Über den Index, nicht über die geparste Prozentzahl: die ist auf drei
    // Stellen gerundet und trifft 1/64 nicht exakt.
    const css = flightKeyframes(PHONE, TRAVEL);
    const steps = frames.length - 1;
    frames.forEach((_, i) => {
      expect(css).toContain(`{transform:${flightTransform(PHONE, i / steps, TRAVEL)}}`);
    });
  });

  // Die native Timeline verbindet die Stützen linear. Zwischen ihnen darf die
  // Marke nicht sichtbar von der echten Bahn abweichen — sonst fliegt Safari
  // eine andere Kurve als der JS-Weg.
  it('weicht zwischen den Stützen um weniger als 0,1px von der Bahn ab', () => {
    const frames = parse(flightKeyframes(PHONE, TRAVEL));
    let worst = 0;
    for (let i = 0; i < frames.length - 1; i += 1) {
      const [a, b] = [frames[i], frames[i + 1]];
      for (let k = 1; k < 8; k += 1) {
        const t = k / 8;
        const exact = flightAt(PHONE, a.p + (b.p - a.p) * t, TRAVEL);
        worst = Math.max(
          worst,
          Math.abs(a.x + (b.x - a.x) * t - exact.x),
          Math.abs(a.y + (b.y - a.y) * t - exact.y),
          // Skalierungsfehler in Pixeln an der rechten Kante der Marke.
          Math.abs(a.scale + (b.scale - a.scale) * t - exact.scale) * PHONE.startW
        );
      }
    }
    expect(worst).toBeLessThan(0.1);
  });
});
