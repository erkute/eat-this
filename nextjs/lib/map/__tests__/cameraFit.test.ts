import { describe, it, expect, vi } from 'vitest';
import type { FlyToOptions } from 'maplibre-gl';
import {
  flyToSpots,
  hasRoomToFit,
  MIN_FIT_SPACE_PX,
  SPOT_SET_MAX_ZOOM,
  type FittableMap,
  type Insets,
} from '../cameraFit';
import { phoneListMidVisiblePx } from '../phoneSheetSnaps';

/* Telefon mit Liste: oben die Kopfzeile samt Pin-Reserve, unten die Liste,
   links und rechts gleich — genau die Form, bei der MapLibre einst warf. */
const phonePadding = (bottom: number): Insets => ({ top: 96, bottom, left: 34, right: 34 });

describe('hasRoomToFit', () => {
  const canvas = { width: 390, height: 800 };

  it('passt bei ausreichend Karte ein', () => {
    expect(hasRoomToFit(canvas, phonePadding(300))).toBe(true);
  });

  it('lässt die Kamera bei exakt 0 px verfügbarer Höhe stehen — der Fall aus JAVASCRIPT-9B', () => {
    expect(hasRoomToFit(canvas, phonePadding(704))).toBe(false);
  });

  it('lässt sie auch bei negativem Platz stehen', () => {
    expect(hasRoomToFit(canvas, phonePadding(760))).toBe(false);
  });

  it('liegt die Grenze genau beim Mindestplatz', () => {
    const bottomAtLimit = canvas.height - 96 - MIN_FIT_SPACE_PX;
    expect(hasRoomToFit(canvas, phonePadding(bottomAtLimit))).toBe(true);
    expect(hasRoomToFit(canvas, phonePadding(bottomAtLimit + 1))).toBe(false);
  });

  it('prüft auch die Breite', () => {
    expect(hasRoomToFit({ width: 200, height: 800 }, phonePadding(100))).toBe(false);
  });

  it.each([568, 667, 844, 896])('lässt dem Telefon-Filter bei %i px Höhe Platz', (height) => {
    const padding = { top: 115, bottom: phoneListMidVisiblePx(height) + 20, left: 34, right: 34 };
    expect(hasRoomToFit({ width: 360, height }, padding)).toBe(true);
  });
});

function fakeMap(width: number, height: number) {
  const flyTo = vi.fn<(options: FlyToOptions) => void>();
  const map: FittableMap = {
    getContainer: () => ({ clientWidth: width, clientHeight: height }) as HTMLElement,
    getPitch: () => 50,
    getBearing: () => -15,
    flyTo,
  };
  return { map, flyTo };
}

const desktopPadding: Insets = { top: 115, bottom: 100, left: 34, right: 34 };
const SPOTS = [
  { lng: 13.2939, lat: 52.5048 },
  { lng: 13.4635, lat: 52.5048 },
  { lng: 13.404, lat: 52.4511 },
  { lng: 13.404, lat: 52.5595 },
];

describe('flyToSpots', () => {
  it('fliegt nirgendwohin ohne Treffer', () => {
    const { map, flyTo } = fakeMap(1060, 756);
    flyToSpots(map, [], desktopPadding, { duration: 500 });
    expect(flyTo).not.toHaveBeenCalled();
  });

  it('zentriert einen einzelnen Treffer mit festem Zoom statt einer entarteten Box', () => {
    const { map, flyTo } = fakeMap(1060, 756);
    flyToSpots(map, [{ lng: 13.4, lat: 52.5 }], desktopPadding, { duration: 500 });
    expect(flyTo).toHaveBeenCalledWith({
      center: [13.4, 52.5],
      zoom: SPOT_SET_MAX_ZOOM,
      padding: desktopPadding,
      duration: 500,
    });
  });

  it('gibt den Rand mit und lässt Neigung und Drehung, wie sie sind', () => {
    const { map, flyTo } = fakeMap(1060, 756);
    flyToSpots(map, SPOTS, desktopPadding, { duration: 500 });
    const options = flyTo.mock.calls[0][0];
    expect(options.padding).toEqual(desktopPadding);
    expect(options).not.toHaveProperty('bearing');
    expect(options).not.toHaveProperty('pitch');
    expect(options.zoom).toBeGreaterThan(11);
    expect(options.zoom).toBeLessThanOrEqual(SPOT_SET_MAX_ZOOM);
  });

  it('bleibt stehen, wenn hinter den Rändern kaum Karte übrig ist', () => {
    const { map, flyTo } = fakeMap(390, 700);
    flyToSpots(map, SPOTS, phonePadding(700 - 96 - MIN_FIT_SPACE_PX + 1), { duration: 500 });
    expect(flyTo).not.toHaveBeenCalled();
  });
});
