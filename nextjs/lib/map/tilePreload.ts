/*
 * Kacheln des nächsten Spots vorladen, solange ein Detail offen ist.
 *
 * Beim Blättern fliegt die Kamera zum Nachbarn, und MapLibre fordert dessen
 * z14-Kacheln erst am Ende des Flugs an (Häuser gibt es erst ab z14). Am
 * Telefon im Mobilnetz stünde der Kartenstreifen sonst eine Weile schwarz; der
 * Engpass ist die Datenmenge, nicht der späte Start.
 *
 * Vorgeladen wird nur die Kachel, in der der Spot liegt, plus ihre z13-Mutter,
 * ein Bruchteil des ganzen Ausschnitts. Die Mitte steht, sobald die Kamera
 * ankommt; die Ränder laden nach.
 *
 * Der Weg ist der HTTP-Cache: OpenFreeMap schickt zehn Jahre `max-age`, und
 * MapLibres eigene Anfrage aus dem Worker trifft die vorgeladene Antwort. Der
 * Körper wird gelesen, damit die Antwort vollständig im Cache landet.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';

import type { LngLat } from './pitchedFit';

const SPOT_TILE_ZOOM = 14;
/** Die Vektorquelle in public/basemap/style.json. */
const BASEMAP_SOURCE = 'carto';

/** Die Kachel-URL der Grundkarte, wie MapLibre sie aus dem TileJSON gelesen
 *  hat. Nicht fest eintragen: OpenFreeMap versioniert den Pfad
 *  (`planet/20260927_080001_pt/…`) und wechselt ihn mit jedem Planet-Build. */
export function basemapTileTemplate(map: MapLibreMap): string | undefined {
  return (map.getSource(BASEMAP_SOURCE) as { tiles?: string[] } | undefined)?.tiles?.[0];
}

/** Die XYZ-Kachel (Web-Mercator), in der ein Punkt liegt. */
export function tileOf({ lng, lat }: LngLat, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const rad = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lng + 180) / 360) * n),
    y: Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n),
  };
}

/** Die Kachel des Spots auf Spot-Zoom und ihre Mutter eine Stufe darüber. */
export function spotTileUrls(template: string, spot: LngLat): string[] {
  return [SPOT_TILE_ZOOM, SPOT_TILE_ZOOM - 1].map((z) => {
    const { x, y } = tileOf(spot, z);
    return template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
  });
}

/* Was schon geholt ist oder gerade geholt wird — einmal je Seitenaufruf
   reicht, danach liegt es im HTTP-Cache. */
const requested = new Set<string>();

const savesData = () =>
  (globalThis.navigator as (Navigator & { connection?: { saveData?: boolean } }) | undefined)
    ?.connection?.saveData === true;

/** Lädt die Mitte des Ausschnitts vor, den die Kamera bei `spot` zeigen wird.
 *  `template` ist die Kachel-URL der Kartenquelle (`{z}/{x}/{y}`); ohne sie
 *  (Karte noch nicht geladen) passiert nichts. */
export function preloadSpotTiles(
  template: string | undefined,
  spot: LngLat | null | undefined
): void {
  if (!template || !spot || savesData()) return;
  for (const url of spotTileUrls(template, spot)) {
    if (requested.has(url)) continue;
    requested.add(url);
    fetch(url)
      .then((res) => res.arrayBuffer())
      .catch(() => requested.delete(url));
  }
}
