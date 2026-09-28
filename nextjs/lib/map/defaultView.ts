/* Gekippt und leicht gedreht: die Karte steht schräg wie eine Isometrie, und
   die Gebäude (Extrusion im Style, build:basemap) bekommen Seitenwände.
   Kameraflüge setzen nur Mitte und Zoom — Neigung und Drehung bleiben, bis
   jemand sie mit zwei Fingern ändert.

   Mitte und Zoom sind nur der Rückfall: normalerweise passt die Karte beim
   Einhängen den ganzen Bestand ein (useMapCamera.initialCamera). Liegt hier
   statt in MapCanvas, weil der Kamera-Code im Haupt-Bundle rechnet und
   MapCanvas mit maplibre-gl erst im Lazy-Chunk kommt. */
export const MAP_PITCH = 50;
export const MAP_BEARING = -15;
export const BERLIN_VIEW = {
  longitude: 13.405,
  latitude: 52.52,
  zoom: 12,
  pitch: MAP_PITCH,
  bearing: MAP_BEARING,
};
