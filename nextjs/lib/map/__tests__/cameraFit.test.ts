import { describe, it, expect, beforeAll } from 'vitest';
import { spotsCameraTarget, hasRoomToFit, MIN_FIT_SPACE_PX, type Insets } from '../cameraFit';
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
