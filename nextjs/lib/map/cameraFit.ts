import type { MapRestaurant } from '@/lib/types';

/** Where the camera should go for a set of matches. `null` = stay put. */
export type CameraTarget =
  | { kind: 'point'; lat: number; lng: number }
  | { kind: 'bounds'; sw: [number, number]; ne: [number, number] };

/**
 * Camera target for a match set: nothing for an empty set, a centred point for
 * a single spot (bounds of one coordinate are degenerate — MapLibre fits them
 * at max zoom), a bounding box for the rest.
 */
export function spotsCameraTarget(list: MapRestaurant[]): CameraTarget | null {
  if (!list.length) return null;
  if (list.length === 1) {
    const [r] = list;
    return { kind: 'point', lat: r.lat, lng: r.lng };
  }
  const lngs = list.map((r) => r.lng);
  const lats = list.map((r) => r.lat);
  return {
    kind: 'bounds',
    sw: [Math.min(...lngs), Math.min(...lats)],
    ne: [Math.max(...lngs), Math.max(...lats)],
  };
}

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Unter dieser Höhe (oder Breite) wird gar nicht erst eingepasst.
 *
 * Gemessen am 16.09.2026 mit MapLibres eigenem `cameraForBoxAndBearing`
 * (390 px breite Karte, Seitenrand 40 px): der ganze Katalog landet bei 30 px
 * Platz auf Zoom 5,4, bei 100 px auf 7,2, bei 150 px auf 7,7 — und ab ~300 px,
 * wo die Breite begrenzt, auf 8,4. Ein Bezirk entsprechend 8,7 / 10,5 / 11,1 /
 * 11,6. Ab 150 px liegt die Kamera also gut einen halben Zoomschritt am
 * Ergebnis mit vollem Platz, darunter zoomt sie zunehmend sinnlos raus.
 */
export const MIN_FIT_SPACE_PX = 150;

/**
 * Bleibt nach Abzug aller Ränder genug Karte, um Treffer einzupassen?
 *
 * Zählt BEIDE Ränder, die MapLibre abzieht: den des Aufrufs und den, den die
 * Karte von einer früheren Kamerafahrt noch hält (`map.getPadding()`).
 *
 * Der Grund, warum das mehr ist als Kosmetik: bei GENAU 0 px verfügbarer Höhe
 * wirft MapLibre `Invalid LngLat object: (NaN, -90)` (Sentry JAVASCRIPT-9B).
 * Der Zoom wird −∞, der Padding-Versatz x ist bei links = rechts 0, und
 * `0 × ∞` ergibt NaN; sein Schutz prüft nur `< 0`, nicht `<= 0`. Der Wurf kam
 * aus dem Filter-Refit-Effekt und kippte /map in die Fehlerseite — auf dem
 * Telefon, wenn die Liste auf den Pixel genau so weit hochgeschoben war.
 */
export function hasRoomToFit(
  canvas: { width: number; height: number },
  padding: Partial<Insets>,
  mapPadding: Partial<Insets>
): boolean {
  // MapLibres PaddingOptions darf Seiten weglassen; es rechnet sie selbst als 0.
  const sum = (a?: number, b?: number, c?: number, d?: number) =>
    (a ?? 0) + (b ?? 0) + (c ?? 0) + (d ?? 0);
  const height =
    canvas.height - sum(padding.top, padding.bottom, mapPadding.top, mapPadding.bottom);
  const width =
    canvas.width - sum(padding.left, padding.right, mapPadding.left, mapPadding.right);
  return height >= MIN_FIT_SPACE_PX && width >= MIN_FIT_SPACE_PX;
}
