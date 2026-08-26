/**
 * Einmal-Audit: vergleicht die in Sanity gespeicherten Koordinaten mit denen,
 * die Google Places zur `googlePlaceId` liefert. Schreibt NICHTS.
 *
 * Field-Mask bewusst nur `id,location,formattedAddress,displayName` — das ist
 * Place Details **Essentials**, die billigste Stufe mit 10.000 Freiaufrufen
 * im Monat. Keine Preis-, Öffnungszeiten- oder Atmosphere-Felder anfragen,
 * die würden den ganzen Request hochstufen.
 *
 * Run from `nextjs/`:  npx tsx scripts/audit-coordinates.ts
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@sanity/client';

loadEnv({ path: '.env.local' });
const KEY = process.env.GOOGLE_API_KEY;
if (!KEY) {
  console.error('GOOGLE_API_KEY fehlt');
  process.exit(1);
}

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});

/** Ab dieser Abweichung stimmt der Kartenpin nicht mehr mit der Adresse. */
const TOLERANCE_M = 250;

interface Row {
  name: string;
  slug: string;
  googlePlaceId: string;
  lat: number;
  lng: number;
  address?: string;
}

function metres(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

async function main() {
  const rows = await sanity.fetch<Row[]>(
    `*[_type == "restaurant" && !(_id in path("drafts.**")) && defined(googlePlaceId)
       && defined(lat) && defined(lng)]
       | order(name asc) { name, "slug": slug.current, googlePlaceId, lat, lng, address }`
  );
  console.log(`${rows.length} Spots mit googlePlaceId und Koordinaten\n`);

  const off: { row: Row; d: number; gLat: number; gLng: number; gAddr?: string }[] = [];
  let errors = 0;
  for (const [i, r] of rows.entries()) {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(r.googlePlaceId)}?languageCode=de`,
      {
        headers: {
          'X-Goog-Api-Key': KEY!,
          'X-Goog-FieldMask': 'id,location,formattedAddress,displayName',
        },
      }
    );
    if (!res.ok) {
      errors++;
      console.warn(`  ${r.name}: HTTP ${res.status}`);
      continue;
    }
    const p = (await res.json()) as {
      location?: { latitude: number; longitude: number };
      formattedAddress?: string;
    };
    if (!p.location) continue;
    const d = metres(r.lat, r.lng, p.location.latitude, p.location.longitude);
    if (d > TOLERANCE_M) {
      off.push({
        row: r,
        d,
        gLat: p.location.latitude,
        gLng: p.location.longitude,
        gAddr: p.formattedAddress,
      });
    }
    if (i % 50 === 49) console.error(`  ${i + 1}/${rows.length}`);
  }

  off.sort((a, b) => b.d - a.d);
  console.log(
    `\n${off.length} Spots weichen um mehr als ${TOLERANCE_M} m ab (Fehler: ${errors}):\n`
  );
  for (const o of off) {
    console.log(`${o.d.toString().padStart(6)} m  ${o.row.name}  (${o.row.slug})`);
    console.log(`           Sanity: ${o.row.lat}, ${o.row.lng}  —  ${o.row.address ?? '?'}`);
    console.log(`           Google: ${o.gLat}, ${o.gLng}  —  ${o.gAddr ?? '?'}`);
  }
}

void main();
