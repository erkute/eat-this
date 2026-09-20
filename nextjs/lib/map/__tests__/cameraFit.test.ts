import { describe, it, expect, beforeAll } from 'vitest';
import {
  spotsCameraTarget,
  hasRoomToFit,
  fitPadding,
  MIN_FIT_SPACE_PX,
  type Insets,
} from '../cameraFit';
import type { MapRestaurant } from '@/lib/types';

const NONE: Insets = { top: 0, bottom: 0, left: 0, right: 0 };
/* Telefon mit Liste: oben die Kopfzeile samt Pin-Reserve, unten die Liste,
   links und rechts gleich — genau die Form, bei der MapLibre wirft. */
const phonePadding = (bottom: number): Insets => ({ top: 96, bottom, left: 34, right: 34 });

describe('hasRoomToFit', () => {
  const canvas = { width: 390, height: 800 };

  it('passt bei ausreichend Karte ein', () => {
    expect(hasRoomToFit(canvas, phonePadding(300), NONE)).toBe(true);
  });

  it('lässt die Kamera bei exakt 0 px verfügbarer Höhe stehen — der Fall aus JAVASCRIPT-9B', () => {
    expect(hasRoomToFit(canvas, phonePadding(704), NONE)).toBe(false);
  });

  it('lässt sie auch bei negativem Platz stehen', () => {
    expect(hasRoomToFit(canvas, phonePadding(760), NONE)).toBe(false);
  });

  it('liegt die Grenze genau beim Mindestplatz', () => {
    const bottomAtLimit = canvas.height - 96 - MIN_FIT_SPACE_PX;
    expect(hasRoomToFit(canvas, phonePadding(bottomAtLimit), NONE)).toBe(true);
    expect(hasRoomToFit(canvas, phonePadding(bottomAtLimit + 1), NONE)).toBe(false);
  });

  it('zählt den Rand mit, den die Karte von einer früheren Kamerafahrt noch hält', () => {
    const bottom = canvas.height - 96 - MIN_FIT_SPACE_PX;
    expect(hasRoomToFit(canvas, phonePadding(bottom), NONE)).toBe(true);
    expect(hasRoomToFit(canvas, phonePadding(bottom), { ...NONE, bottom: 1 })).toBe(false);
  });

  it('prüft auch die Breite', () => {
    expect(hasRoomToFit({ width: 200, height: 800 }, phonePadding(100), NONE)).toBe(false);
  });
});

describe('Wächter: MapLibre wirft bei 0 px, der Check fängt genau das ab', () => {
  /* MapLibres Kamera-Rechnung steht nicht in der öffentlichen API, nur in den
     mitgelieferten TypeScript-Quellen. Ein statischer Import würde `tsc` durch
     ganz `maplibre-gl/src` ziehen (1.970 Fehler in fremdem Code, 16.09.2026) —
     der Pfad als Variable lässt ihn nur Vitest zur Laufzeit auflösen. */
  type CameraHelper = {
    cameraForBoxAndBearing: (...args: unknown[]) => { zoom: number } | undefined;
  };
  type BoundsModule = { LngLatBounds: new (sw: number[], ne: number[]) => unknown };
  let helper: CameraHelper;
  let bounds: unknown;
  beforeAll(async () => {
    const helperPath = 'maplibre-gl/src/geo/projection/camera_helper';
    const boundsPath = 'maplibre-gl/src/geo/lng_lat_bounds';
    helper = (await import(/* @vite-ignore */ helperPath)) as CameraHelper;
    const { LngLatBounds } = (await import(/* @vite-ignore */ boundsPath)) as BoundsModule;
    bounds = new LngLatBounds([13.28, 52.47], [13.46, 52.55]);
  });
  const scale = 2 ** 11;
  const fit = (height: number, padding: Insets) =>
    helper.cameraForBoxAndBearing(
      { padding, offset: [0, 0], maxZoom: 14 },
      padding,
      bounds,
      0,
      { padding: NONE, width: 390, height, scale, worldSize: 512 * scale }
    );

  it('wirft in MapLibre selbst weiterhin — fällt dieser Test, ist der Check dort vielleicht überflüssig', () => {
    const padding = phonePadding(604);
    expect(() => fit(700, padding)).toThrow('Invalid LngLat object: (NaN, -90)');
    expect(hasRoomToFit({ width: 390, height: 700 }, padding, NONE)).toBe(false);
  });

  it('liefert ab dem Mindestplatz einen endlichen Zoom', () => {
    const padding = phonePadding(700 - 96 - MIN_FIT_SPACE_PX);
    expect(hasRoomToFit({ width: 390, height: 700 }, padding, NONE)).toBe(true);
    expect(Number.isFinite(fit(700, padding)?.zoom)).toBe(true);
  });

  /* Derselbe Aufbau, aber mit einem Rand, den die Karte schon hält — genau der
     Zustand nach einer geöffneten und wieder geschlossenen Spot-Karte. */
  const fitHeld = (held: Insets, call: Insets) =>
    helper.cameraForBoxAndBearing({ padding: call, offset: [0, 0], maxZoom: 14 }, call, bounds, 0, {
      padding: held,
      width: 390,
      height: 844,
      scale,
      worldSize: 512 * scale,
    });

  const desired: Insets = { top: 115, bottom: 320, left: 34, right: 34 };
  /* Der Rand der Detail-Fahrt (phoneDetailFlyPadding) bleibt nach dem
     Schliessen auf der Karte stehen. */
  const held: Insets = { top: 84, bottom: 0, left: 20, right: 20 };

  it('zoomt ohne Ausgleich zu weit raus — der Befund aus PR #773', () => {
    const ohne = fitHeld(held, desired)!.zoom;
    const soll = fitHeld(NONE, desired)!.zoom;
    expect(ohne).toBeLessThan(soll);
    expect(soll - ohne).toBeGreaterThan(0.15);
  });

  it('mit Ausgleich steht die Kamera exakt wie auf einer frischen Karte', () => {
    const mit = fitHeld(held, fitPadding(desired, held))!;
    const soll = fitHeld(NONE, desired)!;
    expect(mit.zoom).toBeCloseTo(soll.zoom, 10);
  });

  it('auch wenn die Karte MEHR Rand hält als gewünscht', () => {
    const viel: Insets = { top: 130, bottom: 420, left: 40, right: 40 };
    const mit = fitHeld(viel, fitPadding(desired, viel))!;
    const soll = fitHeld(NONE, desired)!;
    expect(mit.zoom).toBeCloseTo(soll.zoom, 10);
  });

  it('bei 0 geklemmt stimmt der Zoom NICHT — deshalb darf der Ausgleich negativ werden', () => {
    const viel: Insets = { top: 130, bottom: 420, left: 40, right: 40 };
    const roh = fitPadding(desired, viel);
    const geklemmt: Insets = {
      top: Math.max(0, roh.top),
      bottom: Math.max(0, roh.bottom),
      left: Math.max(0, roh.left),
      right: Math.max(0, roh.right),
    };
    expect(fitHeld(viel, geklemmt)!.zoom).not.toBeCloseTo(fitHeld(NONE, desired)!.zoom, 3);
  });
});

describe('fitPadding', () => {
  const desired: Insets = { top: 115, bottom: 320, left: 34, right: 34 };

  it('lässt den Rand in Ruhe, solange die Karte keinen hält', () => {
    expect(fitPadding(desired, NONE)).toEqual(desired);
  });

  it('zieht den ab, den die Karte noch hält', () => {
    expect(fitPadding(desired, { top: 84, bottom: 0, left: 20, right: 20 })).toEqual({
      top: 31,
      bottom: 320,
      left: 14,
      right: 14,
    });
  });

  it('darf ins Minus gehen — geklemmt landet der Ausschnitt daneben', () => {
    expect(fitPadding(desired, { top: 130, bottom: 420, left: 40, right: 40 })).toEqual({
      top: -15,
      bottom: -100,
      left: -6,
      right: -6,
    });
  });

  it('behandelt weggelassene Seiten wie 0 — MapLibres PaddingOptions erlaubt das', () => {
    expect(fitPadding(desired, { bottom: 20 })).toEqual({ ...desired, bottom: 300 });
  });

  it('macht aus beiden Rändern zusammen wieder genau den gewünschten', () => {
    const held: Insets = { top: 84, bottom: 0, left: 20, right: 20 };
    const fit = fitPadding(desired, held);
    expect(fit.top + held.top).toBe(desired.top);
    expect(fit.bottom + held.bottom).toBe(desired.bottom);
    expect(fit.left + held.left).toBe(desired.left);
    expect(fit.right + held.right).toBe(desired.right);
  });
});

const spot = (id: string, lat: number, lng: number): MapRestaurant =>
  ({ _id: id, name: id, lat, lng }) as unknown as MapRestaurant;

describe('spotsCameraTarget', () => {
  it('has no target for an empty set', () => {
    expect(spotsCameraTarget([])).toBeNull();
  });

  it('centres on a single match instead of fitting a degenerate box', () => {
    expect(spotsCameraTarget([spot('a', 52.5, 13.4)])).toEqual({
      kind: 'point',
      lat: 52.5,
      lng: 13.4,
    });
  });

  it('spans every match when there is more than one', () => {
    expect(
      spotsCameraTarget([spot('a', 52.4, 13.5), spot('b', 52.6, 13.2), spot('c', 52.5, 13.3)])
    ).toEqual({ kind: 'bounds', sw: [13.2, 52.4], ne: [13.5, 52.6] });
  });
});
