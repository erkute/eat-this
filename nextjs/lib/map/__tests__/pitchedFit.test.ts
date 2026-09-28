import { describe, it, expect, beforeAll } from 'vitest';
import { medianPoint, pitchedCameraForPoints, projectToScreen, type FitView } from '../pitchedFit';

/* Ein Querschnitt des echten Bestands: die Ecken (Steglitz, Pankow,
   Charlottenburg, Friedrichshain) und ein paar Punkte aus der Mitte. */
const SPOTS = [
  { lng: 13.2939, lat: 52.5048 },
  { lng: 13.4635, lat: 52.5048 },
  { lng: 13.404, lat: 52.4511 },
  { lng: 13.404, lat: 52.5595 },
  { lng: 13.41, lat: 52.53 },
  { lng: 13.42, lat: 52.49 },
  { lng: 13.33, lat: 52.5 },
];

const desktop: FitView = {
  width: 1060,
  height: 756,
  padding: { top: 115, bottom: 100, left: 34, right: 34 },
  pitch: 50,
  bearing: -15,
  maxZoom: 14,
};

function screenBox(view: FitView, camera: NonNullable<ReturnType<typeof pitchedCameraForPoints>>) {
  const pts = SPOTS.map((p) => projectToScreen(p, camera, view));
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxY: Math.max(...pts.map((p) => p.y)),
  };
}

describe('pitchedCameraForPoints', () => {
  it('legt bei geneigter Karte alle Punkte in die Fläche innerhalb der Ränder', () => {
    const camera = pitchedCameraForPoints(SPOTS, desktop)!;
    const box = screenBox(desktop, camera);
    const { padding, width, height } = desktop;
    expect(box.minX).toBeGreaterThanOrEqual(padding.left - 1);
    expect(box.maxX).toBeLessThanOrEqual(width - padding.right + 1);
    expect(box.minY).toBeGreaterThanOrEqual(padding.top - 1);
    expect(box.maxY).toBeLessThanOrEqual(height - padding.bottom + 1);
  });

  it('nutzt die Fläche aus: eine Richtung stößt an beide Ränder', () => {
    const camera = pitchedCameraForPoints(SPOTS, desktop)!;
    const box = screenBox(desktop, camera);
    const innerW = desktop.width - desktop.padding.left - desktop.padding.right;
    const innerH = desktop.height - desktop.padding.top - desktop.padding.bottom;
    const fill = Math.max((box.maxX - box.minX) / innerW, (box.maxY - box.minY) / innerH);
    expect(fill).toBeGreaterThan(0.98);
  });

  it('mittelt die Punkte in der Fläche', () => {
    const camera = pitchedCameraForPoints(SPOTS, desktop)!;
    const box = screenBox(desktop, camera);
    const { padding, width, height } = desktop;
    const innerCx = padding.left + (width - padding.left - padding.right) / 2;
    const innerCy = padding.top + (height - padding.top - padding.bottom) / 2;
    expect(Math.abs((box.minX + box.maxX) / 2 - innerCx)).toBeLessThan(1);
    expect(Math.abs((box.minY + box.maxY) / 2 - innerCy)).toBeLessThan(1);
  });

  it('zoomt bei Neigung näher heran als die flache Rechnung von MapLibre', () => {
    /* Die flache Rechnung (Neigung 0) ist, was fitBounds heute tut. Geneigt
       schrumpft die obere Hälfte zur Mitte hin — derselbe Bestand passt dann
       erst bei einem größeren Zoom an den Rand. */
    const flat = pitchedCameraForPoints(SPOTS, { ...desktop, pitch: 0 })!;
    const pitched = pitchedCameraForPoints(SPOTS, desktop)!;
    expect(pitched.zoom).toBeGreaterThan(flat.zoom);
  });

  it('entspricht ohne Neigung und Drehung der flachen Mercator-Einpassung', () => {
    const view: FitView = { ...desktop, pitch: 0, bearing: 0 };
    const camera = pitchedCameraForPoints(SPOTS, view)!;
    // Flach ist die Breite der begrenzende Richtung nicht zwingend — beide prüfen.
    const box = screenBox(view, camera);
    const innerW = view.width - view.padding.left - view.padding.right;
    const innerH = view.height - view.padding.top - view.padding.bottom;
    const fill = Math.max((box.maxX - box.minX) / innerW, (box.maxY - box.minY) / innerH);
    expect(fill).toBeCloseTo(1, 2);
  });

  it('hält den Zoom unter maxZoom und mittelt trotzdem', () => {
    const close = [
      { lng: 13.4, lat: 52.52 },
      { lng: 13.4005, lat: 52.5202 },
    ];
    const camera = pitchedCameraForPoints(close, desktop)!;
    expect(camera.zoom).toBe(14);
    const pts = close.map((p) => projectToScreen(p, camera, desktop));
    const cx = (pts[0].x + pts[1].x) / 2;
    expect(Math.abs(cx - (desktop.padding.left + (desktop.width - 68) / 2))).toBeLessThan(1);
  });

  it('gibt ohne Punkte null zurück', () => {
    expect(pitchedCameraForPoints([], desktop)).toBeNull();
  });

  it('gibt null zurück, wenn innerhalb der Ränder nichts übrig bleibt', () => {
    expect(
      pitchedCameraForPoints(SPOTS, { ...desktop, padding: { ...desktop.padding, bottom: 700 } })
    ).toBeNull();
  });
});

describe('projectToScreen', () => {
  /* Die Rechnung bildet MapLibres Perspektive nach. Stimmt sie nach einem
     Update nicht mehr (anderes Sichtfeld, anderer Umgang mit dem Rand),
     passt jede Einpassung daneben — deshalb gegen MapLibres eigene
     Transform geprüft, nicht gegen eine zweite Kopie derselben Formel. */
  /* Wie in cameraFit.test: MapLibres Transform steht nur in den mitgelieferten
     Quellen. Ein statischer Import zöge `tsc` durch ganz `maplibre-gl/src`,
     der Pfad als Variable lässt ihn nur Vitest zur Laufzeit auflösen. */
  type Point = { x: number; y: number };
  type Transform = {
    resize(w: number, h: number): void;
    setPitch(p: number): void;
    setBearing(b: number): void;
    setPadding(p: FitView['padding']): void;
    setZoom(z: number): void;
    setCenter(c: unknown): void;
    locationToScreenPoint(ll: unknown): Point;
  };
  let MercatorTransform: new () => Transform;
  let LngLat: new (lng: number, lat: number) => unknown;
  beforeAll(async () => {
    const transformPath = 'maplibre-gl/src/geo/projection/mercator_transform';
    const lngLatPath = 'maplibre-gl/src/geo/lng_lat';
    ({ MercatorTransform } = await import(/* @vite-ignore */ transformPath));
    ({ LngLat } = await import(/* @vite-ignore */ lngLatPath));
  });

  it('landet auf demselben Pixel wie MapLibre', () => {
    const camera = pitchedCameraForPoints(SPOTS, desktop)!;
    const tr = new MercatorTransform();
    tr.resize(desktop.width, desktop.height);
    tr.setPitch(desktop.pitch);
    tr.setBearing(desktop.bearing);
    tr.setPadding(desktop.padding);
    tr.setZoom(camera.zoom);
    tr.setCenter(new LngLat(camera.center.lng, camera.center.lat));
    for (const p of SPOTS) {
      const expected = tr.locationToScreenPoint(new LngLat(p.lng, p.lat));
      const actual = projectToScreen(p, camera, desktop);
      expect(actual.x).toBeCloseTo(expected.x, 1);
      expect(actual.y).toBeCloseTo(expected.y, 1);
    }
  });
});

describe('medianPoint', () => {
  it('liegt auf der dichten Mitte, nicht in der Mitte der Box', () => {
    const cluster = [
      { lng: 13.40, lat: 52.52 },
      { lng: 13.41, lat: 52.52 },
      { lng: 13.42, lat: 52.53 },
      { lng: 13.29, lat: 52.44 }, // Steglitz
    ];
    const middle = medianPoint(cluster)!;
    expect(middle.lng).toBeCloseTo(13.405, 9);
    expect(middle.lat).toBeCloseTo(52.52, 9);
  });

  it('gibt ohne Punkte null zurück', () => {
    expect(medianPoint([])).toBeNull();
  });
});
