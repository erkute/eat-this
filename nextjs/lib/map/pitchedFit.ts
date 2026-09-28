import type { Insets } from './cameraFit';

/**
 * Einpassen für die GENEIGTE Karte.
 *
 * MapLibres `fitBounds`/`cameraForBounds` rechnen flach: `cameraForBoxAndBearing`
 * (geo/projection/camera_helper.ts) teilt die freie Fläche durch die
 * Mercator-Ausdehnung der Box, die Neigung kommt in der Rechnung nicht vor.
 * Bei unseren 50° schrumpft die obere Bildhälfte perspektivisch zur Mitte hin
 * — der Bestand lag nach einer Suche als Insel in der Mitte, darüber
 * Hennigsdorf (Audit 28.09.2026). Außerdem setzt `fitBounds` die Drehung auf
 * 0 zurück, wenn man sie nicht mitgibt.
 *
 * Diese Rechnung bildet MapLibres Perspektive nach und passt iterativ ein:
 * alle Punkte projizieren, die Bildschirm-Box der Punkte in die Mitte der
 * freien Fläche schieben, den Zoom um das Verhältnis korrigieren — bis beides
 * steht. Das Ergebnis geht als Mitte + Zoom + Rand an `flyTo`, das den Rand
 * genau einmal abzieht.
 */

export type LngLat = { lng: number; lat: number };

export interface FitView {
  /** Leinwand in CSS-Pixeln. */
  width: number;
  height: number;
  /** Was Bedienelemente und Sheet verdecken — dort darf kein Punkt landen. */
  padding: Insets;
  /** Grad, wie `map.getPitch()` / `map.getBearing()`. */
  pitch: number;
  bearing: number;
  maxZoom: number;
}

export interface FitCamera {
  center: LngLat;
  zoom: number;
}

/* MapLibre: Kachelgröße 512 und senkrechtes Sichtfeld 36,87°
   (Transform `_fovInRadians`, Vorgabe von `verticalFieldOfView`). */
const TILE_SIZE = 512;
const FOV_RAD = 0.6435011087932844;

const mercX = (lng: number) => (180 + lng) / 360;
const mercY = (lat: number) =>
  (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) / 360;
const lngFromMercX = (x: number) => x * 360 - 180;
const latFromMercY = (y: number) =>
  (360 / Math.PI) * Math.atan(Math.exp(((180 - y * 360) * Math.PI) / 180)) - 90;

/* Abstand der Kamera zur Kartenmitte in Pixeln — hängt an der VOLLEN Höhe,
   der Rand verschiebt nur den Fluchtpunkt in die Mitte der freien Fläche. */
const cameraDistance = (height: number) => (0.5 / Math.tan(FOV_RAD / 2)) * height;

function principalPoint(view: FitView) {
  const { padding, width, height } = view;
  return {
    x: padding.left + (width - padding.left - padding.right) / 2,
    y: padding.top + (height - padding.top - padding.bottom) / 2,
  };
}

/* Welt-Versatz (Pixel beim aktuellen Zoom, gedreht, y nach unten) → Versatz
   auf dem Bildschirm vom Fluchtpunkt aus. `null`, wenn der Punkt hinter dem
   Horizont liegt. */
function perspective(x: number, y: number, view: FitView) {
  const d = cameraDistance(view.height);
  const theta = (view.pitch * Math.PI) / 180;
  const depth = d - y * Math.sin(theta);
  if (depth <= 1) return null;
  return { x: (x * d) / depth, y: (y * Math.cos(theta) * d) / depth };
}

function inversePerspective(sx: number, sy: number, view: FitView) {
  const d = cameraDistance(view.height);
  const theta = (view.pitch * Math.PI) / 180;
  const y = (sy * d) / (d * Math.cos(theta) + sy * Math.sin(theta));
  return { x: (sx * (d - y * Math.sin(theta))) / d, y };
}

function rotate(x: number, y: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
}

function worldOffset(p: LngLat, center: LngLat, zoom: number, bearing: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  // Bearing ist die Kompassrichtung, die oben steht: die Welt dreht sich um −bearing.
  return rotate((mercX(p.lng) - mercX(center.lng)) * scale, (mercY(p.lat) - mercY(center.lat)) * scale, -bearing);
}

/** Wo `p` bei dieser Kamera auf dem Bildschirm landet (CSS-Pixel). */
export function projectToScreen(p: LngLat, camera: FitCamera, view: FitView) {
  const w = worldOffset(p, camera.center, camera.zoom, view.bearing);
  const s = perspective(w.x, w.y, view);
  const pp = principalPoint(view);
  if (!s) return { x: NaN, y: NaN };
  return { x: pp.x + s.x, y: pp.y + s.y };
}

const MAX_STEPS = 60;

/**
 * Mitte und Zoom, bei denen alle `points` innerhalb der Ränder liegen und die
 * freie Fläche in einer Richtung ausfüllen. `null` ohne Punkte oder ohne
 * freie Fläche.
 */
export function pitchedCameraForPoints(points: LngLat[], view: FitView): FitCamera | null {
  if (!points.length) return null;
  const innerW = view.width - view.padding.left - view.padding.right;
  const innerH = view.height - view.padding.top - view.padding.bottom;
  if (innerW <= 0 || innerH <= 0) return null;

  const xs = points.map((p) => mercX(p.lng));
  const ys = points.map((p) => mercY(p.lat));
  let cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  let cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  // Start: die flache Einpassung, gedreht wie die Karte.
  const center0 = { lng: lngFromMercX(cx), lat: latFromMercY(cy) };
  const rotated0 = points.map((p) => worldOffset(p, center0, 0, view.bearing));
  const spanX = Math.max(...rotated0.map((p) => p.x)) - Math.min(...rotated0.map((p) => p.x));
  const spanY = Math.max(...rotated0.map((p) => p.y)) - Math.min(...rotated0.map((p) => p.y));
  const clampZoom = (z: number) => Math.min(view.maxZoom, z);
  let zoom =
    spanX > 0 || spanY > 0
      ? clampZoom(Math.log2(Math.min(innerW / (spanX || Infinity), innerH / (spanY || Infinity))))
      : view.maxZoom;

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const center = { lng: lngFromMercX(cx), lat: latFromMercY(cy) };
    const screen = points.map((p) => {
      const w = worldOffset(p, center, zoom, view.bearing);
      return perspective(w.x, w.y, view);
    });
    if (screen.some((s) => s === null)) {
      // Ein Punkt liegt hinter dem Horizont: erst weit genug raus.
      zoom -= 0.5;
      continue;
    }
    const sx = screen.map((s) => s!.x);
    const sy = screen.map((s) => s!.y);
    const minX = Math.min(...sx);
    const maxX = Math.max(...sx);
    const minY = Math.min(...sy);
    const maxY = Math.max(...sy);

    // Die Box in die Mitte der freien Fläche schieben …
    const ground = inversePerspective((minX + maxX) / 2, (minY + maxY) / 2, view);
    const back = rotate(ground.x, ground.y, view.bearing);
    const scale = TILE_SIZE * 2 ** zoom;
    cx += back.x / scale;
    cy += back.y / scale;

    // … und den Zoom um das Verhältnis zur freien Fläche korrigieren.
    const ratio = Math.min(
      maxX > minX ? innerW / (maxX - minX) : Infinity,
      maxY > minY ? innerH / (maxY - minY) : Infinity
    );
    const nextZoom = Number.isFinite(ratio) ? clampZoom(zoom + Math.log2(ratio)) : view.maxZoom;
    const settled = Math.hypot(ground.x, ground.y) < 0.05 && Math.abs(nextZoom - zoom) < 1e-5;
    zoom = nextZoom;
    if (settled) break;
  }

  return { center: { lng: lngFromMercX(cx), lat: latFromMercY(cy) }, zoom };
}

/**
 * Der Median in Länge und Breite — die dichteste Stelle eines Bestands, der
 * sich um eine Mitte ballt. Für eine Kamera, die nicht alles zeigen kann:
 * die Mitte der Box legte ein einzelner Spot in Steglitz fest, und die
 * dichte Mitte hing dann am oberen Rand.
 */
export function medianPoint(points: LngLat[]): LngLat | null {
  if (!points.length) return null;
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  return { lng: median(points.map((p) => p.lng)), lat: median(points.map((p) => p.lat)) };
}
