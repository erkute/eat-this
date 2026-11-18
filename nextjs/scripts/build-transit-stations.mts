/*
 * Baut `public/basemap/transit-berlin.json`: die U- und S-Bahnhöfe Berlins als
 * GeoJSON, aus OpenStreetMap über die Overpass-API.
 *
 * Eigene Daten, weil die Grundkarte das nicht liefern kann: ihre `poi`-Ebene
 * führt zwar Bahnhöfe, aber `build-basemap-style.mts` wirft alle Icons raus
 * (DROP_ICONS), und ohne Zeichen stünde nirgends, ob ein Name zur U-, S- oder
 * Regionalbahn gehört.
 *
 * Was gilt als was:
 *   station=subway      → U
 *   station=light_rail  → S (so ist die Berliner S-Bahn in OSM getaggt,
 *                            nicht als `station=train`)
 * Alles ohne `station`-Tag ist Regional- und Fernbahn oder eine Parkeisenbahn
 * und fliegt raus.
 *
 * Doppelte Bahnhöfe werden zusammengelegt (MERGE_RADIUS_M): einige stehen in
 * OSM zweimal, weil dort zwei Linien eigene Bahnsteig-Stationen haben. Wo U und
 * S denselben Namen am selben Ort tragen, wird daraus eine Plakette mit beiden
 * Zeichen, wie am Eingang.
 *
 * Aufruf: npm run build:transit-stations (die erzeugte Datei mitcommitten)
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'public', 'basemap', 'transit-berlin.json');

const OVERPASS = 'https://overpass-api.de/api/interpreter';

/* Bis hierhin gelten zwei gleichnamige Bahnhöfe als derselbe Ort. 500 m ist
   großzügig gewählt: die weiteste echte Zusammenlegung ist Warschauer Straße
   (U1 zu S-Bahn, rund 250 m Luftlinie). Nach oben schützt die Namensgleichheit
   — zwei verschiedene Bahnhöfe mit identischem Namen gibt es in Berlin nicht. */
const MERGE_RADIUS_M = 500;

/* Nachkommastellen der Koordinaten. 5 sind rund 1 m — genauer muss eine
   Plakette nicht sitzen, und es halbiert die Dateigröße gegenüber dem
   Rohbestand mit 7 Stellen. */
const COORD_PRECISION = 5;

const QUERY = `
[out:json][timeout:180];
area["boundary"="administrative"]["name"="Berlin"]["admin_level"="4"]->.b;
(
  node(area.b)["railway"~"^(station|halt)$"]["station"~"^(subway|light_rail)$"];
  way(area.b)["railway"~"^(station|halt)$"]["station"~"^(subway|light_rail)$"];
);
out tags center;
`;

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

type Mode = 'u' | 's' | 'us';

interface Station {
  name: string;
  mode: Mode;
  lat: number;
  lng: number;
  /* Wie viele Rohdatensätze in diesem Punkt stecken — nur für den Bericht. */
  merged: number;
}

/* „S Friedrichstraße", „U Potsdamer Platz", „Berlin-Tiergarten": OSM führt bei
   einer Handvoll Bahnhöfe das Verkehrsmittel oder die Stadt im Namen. Auf
   dieser Karte steht das Zeichen daneben und die Stadt ist gesetzt — beides
   wäre doppelt. */
function normalizeName(raw: string): string {
  return raw
    .replace(/^S\+U\s+/i, '')
    .replace(/^(S|U)-Bahnhof\s+/i, '')
    .replace(/^(S|U)\s+/, '')
    .replace(/^Berlin[-\s]/, '')
    .trim();
}

/* Abstand in Metern, flache Näherung — auf Stadtgröße genau genug für einen
   Radius, der ohnehin in Hunderten Metern gedacht ist. */
function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const latRad = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (a.lng - b.lng) * 111_320 * Math.cos(latRad);
  const dy = (a.lat - b.lat) * 110_574;
  return Math.hypot(dx, dy);
}

const response = await fetch(OVERPASS, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    /* Ohne eigene Kennung antwortet Overpass mit 406 — die Standardkennung
       von Nodes `fetch` steht dort auf der Sperrliste. */
    'User-Agent': 'eat-this-basemap-build/1.0 (https://www.eatthisdot.com)',
  },
  body: new URLSearchParams({ data: QUERY }),
});
if (!response.ok) throw new Error(`Overpass antwortete ${response.status} ${response.statusText}`);

const payload = (await response.json()) as { elements: OverpassElement[] };

const raw: Station[] = [];
for (const element of payload.elements) {
  const tags = element.tags ?? {};
  const name = tags.name ? normalizeName(tags.name) : '';
  if (!name) continue;
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (lat == null || lon == null) continue;
  raw.push({
    name,
    mode: tags.station === 'subway' ? 'u' : 's',
    lat,
    lng: lon,
    merged: 1,
  });
}
if (raw.length < 250) throw new Error(`Nur ${raw.length} Bahnhöfe — das ist zu wenig für Berlin.`);

/* Zusammenlegen: gleicher Name, nah beieinander. U und S werden dabei zu 'us'.
   Der Punkt wandert in die Mitte aller beteiligten Rohpunkte, damit die
   Plakette bei Stadtmitte zwischen beiden Bahnsteigen sitzt statt an einem. */
const merged: (Station & { sumLat: number; sumLng: number })[] = [];
for (const station of raw) {
  const hit = merged.find(
    (m) => m.name === station.name && distanceM(m, station) <= MERGE_RADIUS_M
  );
  if (!hit) {
    merged.push({ ...station, sumLat: station.lat, sumLng: station.lng });
    continue;
  }
  hit.merged += 1;
  hit.sumLat += station.lat;
  hit.sumLng += station.lng;
  hit.lat = hit.sumLat / hit.merged;
  hit.lng = hit.sumLng / hit.merged;
  if (hit.mode !== station.mode) hit.mode = 'us';
}

/* Sortiert nach Name, damit der Diff gegen den nächsten Lauf lesbar bleibt —
   Overpass gibt keine stabile Reihenfolge zurück. */
merged.sort((a, b) => a.name.localeCompare(b.name, 'de'));

const round = (n: number) => Number(n.toFixed(COORD_PRECISION));

const geojson = {
  type: 'FeatureCollection' as const,
  /* Kurze Schlüssel, weil sie ~300 Mal in der Datei stehen: `n` Name, `m`
     Verkehrsmittel. `s` ist der Sortierschlüssel für MapLibres
     Kollisionserkennung — bei Platzmangel gewinnt der Umsteigebahnhof. */
  features: merged.map((station) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [round(station.lng), round(station.lat)] },
    properties: {
      n: station.name,
      m: station.mode,
      s: station.mode === 'us' ? 0 : 1,
    },
  })),
};

writeFileSync(OUT, `${JSON.stringify(geojson)}\n`);

const count = (m: Mode) => merged.filter((s) => s.mode === m).length;
console.log(`public/basemap/transit-berlin.json: ${merged.length} Bahnhöfe`);
console.log(`  U ${count('u')}   S ${count('s')}   U+S ${count('us')}   (aus ${raw.length} Rohpunkten)`);
const collapsed = merged.filter((s) => s.merged > 1);
console.log(`  ${collapsed.length} zusammengelegt: ${collapsed.map((s) => s.name).join(', ')}`);
