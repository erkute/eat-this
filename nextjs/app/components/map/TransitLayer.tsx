'use client';
import { useEffect, useState } from 'react';
import { Layer, Source, useMap } from 'react-map-gl/maplibre';
import type { LayerProps } from 'react-map-gl/maplibre';

/* Die U- und S-Bahnhöfe Berlins als Orientierungshilfe unter den Pins.
 *
 * Warum es sie braucht: sobald eine Detailansicht offen ist, treten alle
 * anderen Spots zurück (siehe `pinLogoDim` in MapMarkers.module.css) — und
 * dann steht ein einzelner Pin auf einer Karte ohne Bezugspunkte. Das
 * Straßennetz allein beantwortet „wo ist das?" nicht; „am U Görlitzer
 * Bahnhof" beantwortet es sofort.
 *
 * Gezeichnet wird im Canvas, nicht als DOM-Marker. Das hat drei Gründe:
 * 284 Bahnhöfe wären 284 zusätzliche DOM-Knoten neben den Pins; MapLibre
 * räumt überlappende Plaketten selbst weg (Kollisionserkennung), was bei
 * DOM-Markern von Hand nachgebaut werden müsste; und die Ebene liegt damit
 * automatisch UNTER den Pins, weil das Canvas unter dem Marker-Container
 * liegt. Diese Reihenfolge ist Absicht — die Bahnhöfe sind Hilfe, die Pins
 * sind der Inhalt.
 *
 * Die Daten kommen aus `npm run build:transit-stations`.
 */

const SOURCE_ID = 'transit-berlin';
const DATA_URL = '/basemap/transit-berlin.json';

/* Kantenlänge des U-Quadrats bzw. Durchmesser des S-Kreises in CSS-Pixeln,
   bei icon-size 1. Zum Vergleich: ein Restaurant-Pin ist 38×42. Die Plakette
   ist bewusst deutlich kleiner — sie soll den Blick führen, nicht halten. */
const BADGE_SIZE = 15;

/* Abstand zwischen den beiden Zeichen an einem Umsteigebahnhof. */
const BADGE_GAP = 2.5;

/* Auflösung, in der die Plaketten in den Sprite-Atlas gelegt werden. 3 deckt
   auch Telefone mit dreifacher Pixeldichte scharf ab; drei Bilder à 45×45
   kosten im Atlas nichts. */
const BADGE_PIXEL_RATIO = 3;

/* Die Signalfarben der beiden Netze, je eine Spur dunkler als das Original —
   auf dem Ink-Grund (#0e0e0e) trägt die volle Sättigung zu weit und tritt
   gegen die gelben Pins an. Das Weiß der Buchstaben steht auf beiden über
   5:1, bleibt also auch bei 10 px lesbar.
   Blau und Grün sind hier keine Gestaltungsentscheidung, sondern die Sache
   selbst: nach genau diesen zwei Farben sucht man in Berlin. */
const U_BAHN_BLUE = '#0a5ca9';
const S_BAHN_GREEN = '#00713f';

/* Ab hier lohnen sich die Plaketten. Darunter steht die halbe Stadt im Bild
   und 284 Zeichen wären Rauschen — der Ausschnitt beantwortet die Frage
   „welcher Kiez?" dort noch selbst. */
const MIN_ZOOM = 11.5;

/* Ab hier steht der Name daneben. Vorher ist zu wenig Platz, und die
   Kollisionserkennung würde ohnehin die meisten wegräumen. */
const LABEL_ZOOM = 13.5;

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + size - radius, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
  ctx.lineTo(x + size, y + size - radius);
  ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
  ctx.lineTo(x + radius, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/** Ein Zeichen: Quadrat für die U-Bahn, Kreis für die S-Bahn — so wie am
 *  Bahnhofseingang. Die Form allein trägt den Unterschied schon, bevor die
 *  Farbe gelesen ist. */
function drawSign(ctx: CanvasRenderingContext2D, x: number, kind: 'u' | 's') {
  const size = BADGE_SIZE;
  ctx.fillStyle = kind === 'u' ? U_BAHN_BLUE : S_BAHN_GREEN;
  if (kind === 's') {
    ctx.beginPath();
    ctx.arc(x + size / 2, size / 2, size / 2, 0, Math.PI * 2);
  } else {
    roundedRectPath(ctx, x, 0, size, size * 0.16);
  }
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${size * 0.74}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  /* Ein Hauch tiefer als die geometrische Mitte: `middle` legt die Grundlinie
     nach der Schriftmetrik aus, und bei einer Versalie allein sitzt das
     optische Zentrum darunter. */
  ctx.fillText(kind === 'u' ? 'U' : 'S', x + size / 2, size / 2 + size * 0.045);
}

function renderBadge(kinds: ('u' | 's')[]): ImageData | null {
  const width = kinds.length * BADGE_SIZE + (kinds.length - 1) * BADGE_GAP;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * BADGE_PIXEL_RATIO);
  canvas.height = Math.round(BADGE_SIZE * BADGE_PIXEL_RATIO);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(BADGE_PIXEL_RATIO, BADGE_PIXEL_RATIO);
  kinds.forEach((kind, i) => drawSign(ctx, i * (BADGE_SIZE + BADGE_GAP), kind));
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/* Die Namen der drei Bilder im Atlas. `m` aus den Daten hängt direkt hinten
   dran — siehe `icon-image` unten. */
const BADGES: Record<string, ('u' | 's')[]> = {
  'et-transit-u': ['u'],
  'et-transit-s': ['s'],
  /* Am Umsteigebahnhof steht in Berlin das S vor dem U („S+U Alexanderplatz"). */
  'et-transit-us': ['s', 'u'],
};

const badgeLayer: LayerProps = {
  id: 'transit-badge',
  type: 'symbol',
  source: SOURCE_ID,
  minzoom: MIN_ZOOM,
  layout: {
    'icon-image': ['concat', 'et-transit-', ['get', 'm']],
    'icon-size': ['interpolate', ['linear'], ['zoom'], MIN_ZOOM, 0.6, 13, 0.8, 15, 1],
    /* Kein `allow-overlap`: genau die Kollisionserkennung ist der Grund für
       eine Canvas-Ebene. Bei Platzmangel gewinnt der Umsteigebahnhof
       (`s` = 0 in den Daten), weil der als Orientierungspunkt mehr trägt. */
    'icon-padding': 3,
    'symbol-sort-key': ['get', 's'],
    'text-field': ['step', ['zoom'], '', LABEL_ZOOM, ['get', 'n']],
    'text-font': ['Noto Sans Regular'],
    'text-size': ['interpolate', ['linear'], ['zoom'], LABEL_ZOOM, 10, 16, 12],
    'text-anchor': 'left',
    /* In em der Schriftgröße, nicht in Pixeln — die Doppelplakette ist gut
       doppelt so breit und braucht entsprechend mehr Vorlauf. */
    'text-offset': [
      'case',
      ['==', ['get', 'm'], 'us'],
      ['literal', [2.1, 0.05]],
      ['literal', [1.05, 0.05]],
    ],
    'text-max-width': 9,
    /* Lieber das Zeichen ohne Namen als gar kein Zeichen: wo der Name nicht
       hinpasst, bleibt die Plakette trotzdem stehen. */
    'text-optional': true,
  },
  paint: {
    /* Etwas unter voll, damit die Zeichen auf dem dunklen Grund nicht härter
       stehen als die Pins darüber. */
    'icon-opacity': 0.92,
    /* Wärmeres Grau als die Straßennamen der Grundkarte (rgba(181,180,180)),
       eine Spur heller — der Bahnhofsname ist die nützlichere Auskunft. */
    'text-color': '#c9c2b6',
    'text-halo-color': '#0e0e0e',
    'text-halo-width': 1.2,
  },
};

export default function TransitLayer() {
  const { current: mapRef } = useMap();
  const [badgesReady, setBadgesReady] = useState(false);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    let cancelled = false;

    const install = () => {
      if (cancelled) return;
      for (const [name, kinds] of Object.entries(BADGES)) {
        if (map.hasImage(name)) continue;
        const image = renderBadge(kinds);
        if (!image) return;
        map.addImage(name, image, { pixelRatio: BADGE_PIXEL_RATIO });
      }
      setBadgesReady(true);
    };

    /* Vor dem Style-Load nimmt MapLibre keine Bilder an. Und die Quelle darf
       erst danach kommen, sonst meldet MapLibre für jeden Bahnhof ein
       fehlendes Bild in die Konsole. */
    if (map.isStyleLoaded()) install();
    else map.once('load', install);

    return () => {
      cancelled = true;
      map.off('load', install);
    };
  }, [mapRef]);

  if (!badgesReady) return null;

  return (
    <Source id={SOURCE_ID} type="geojson" data={DATA_URL}>
      <Layer {...badgeLayer} />
    </Source>
  );
}
