import type { FlyToOptions } from 'maplibre-gl';
import { pitchedCameraForPoints, type LngLat } from './pitchedFit';

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Näher als das rückt eine Einpassung nicht heran — auch nicht für einen einzelnen Treffer. */
export const SPOT_SET_MAX_ZOOM = 14;

/**
 * Unter dieser Höhe (oder Breite) wird gar nicht erst eingepasst.
 *
 * Gemessen am 16.09.2026 mit MapLibres eigenem `cameraForBoxAndBearing`
 * (390 px breite Karte, Seitenrand 40 px): der ganze Katalog landet bei 30 px
 * Platz auf Zoom 5,4, bei 100 px auf 7,2, bei 150 px auf 7,7 — und ab ~300 px,
 * wo die Breite begrenzt, auf 8,4. Ab 150 px liegt die Kamera also gut einen
 * halben Zoomschritt am Ergebnis mit vollem Platz, darunter zoomt sie
 * zunehmend sinnlos raus. Bei genau 0 px warf MapLibre damals
 * `Invalid LngLat object: (NaN, -90)` (Sentry JAVASCRIPT-9B) und kippte /map
 * in die Fehlerseite.
 */
export const MIN_FIT_SPACE_PX = 150;

/** Bleibt innerhalb der Ränder genug Karte, um Treffer einzupassen? */
export function hasRoomToFit(canvas: { width: number; height: number }, padding: Insets): boolean {
  const height = canvas.height - padding.top - padding.bottom;
  const width = canvas.width - padding.left - padding.right;
  return height >= MIN_FIT_SPACE_PX && width >= MIN_FIT_SPACE_PX;
}

/** Was die Kamerafahrt von der Karte braucht — `MapRef` und MapLibres `Map` erfüllen es. */
export interface FittableMap {
  getContainer(): HTMLElement;
  getPitch(): number;
  getBearing(): number;
  flyTo(options: FlyToOptions): unknown;
}

/**
 * Fliegt so, dass alle `spots` innerhalb von `padding` im Bild stehen.
 *
 * Eingepasst wird mit der geneigten Perspektive (pitchedFit), nicht mit
 * MapLibres `fitBounds`, das flach rechnet und die Drehung auf 0 setzt. Der
 * Rand geht direkt an `flyTo` und ersetzt den, den die Karte von der letzten
 * Fahrt noch hält — er wird also genau einmal abgezogen.
 *
 * Ein einzelner Treffer bekommt den festen Zoom statt einer Einpassung: die
 * Box eines Punkts ist entartet.
 */
export function flyToSpots(
  map: FittableMap,
  spots: LngLat[],
  padding: Insets,
  { duration }: { duration: number }
): void {
  if (!spots.length) return;
  if (spots.length === 1) {
    const [spot] = spots;
    map.flyTo({ center: [spot.lng, spot.lat], zoom: SPOT_SET_MAX_ZOOM, padding, duration });
    return;
  }
  const container = map.getContainer();
  const canvas = { width: container.clientWidth, height: container.clientHeight };
  if (!hasRoomToFit(canvas, padding)) return;
  const camera = pitchedCameraForPoints(spots, {
    ...canvas,
    padding,
    pitch: map.getPitch(),
    bearing: map.getBearing(),
    maxZoom: SPOT_SET_MAX_ZOOM,
  });
  if (!camera) return;
  map.flyTo({
    center: [camera.center.lng, camera.center.lat],
    zoom: camera.zoom,
    padding,
    duration,
  });
}
