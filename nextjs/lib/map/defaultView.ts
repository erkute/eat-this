/* Flach und genordet: die Karte steht von oben, wie man einen Stadtplan
   liest (Betreiber, 30.10.2026). Neigen und drehen lässt sie sich weiter mit
   zwei Fingern; Kameraflüge setzen nur Mitte und Zoom und behalten das bei.

   Mitte und Zoom sind nur der Rückfall: normalerweise passt die Karte beim
   Einhängen den ganzen Bestand ein (useMapCamera.initialCamera). Liegt hier
   statt in MapCanvas, weil der Kamera-Code im Haupt-Bundle rechnet und
   MapCanvas mit maplibre-gl erst im Lazy-Chunk kommt. */
export const MAP_PITCH = 0;
export const MAP_BEARING = 0;
export const BERLIN_VIEW = {
  longitude: 13.405,
  latitude: 52.52,
  zoom: 12,
  pitch: MAP_PITCH,
  bearing: MAP_BEARING,
};
