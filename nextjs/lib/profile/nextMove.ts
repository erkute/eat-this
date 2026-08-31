import { haversineDistance } from '@/lib/map/distance';
import type { MapMustEat } from '@/lib/types';
import { isAlbumMustEatCollected } from './mustEatAlbum';

/* Dieselbe Rueckfallkette wie im Deck: ein Spot ohne gepflegten Bezirk faellt
   nicht raus, er sammelt sich unter der Stadt. Der Name ist in beiden Sprachen
   derselbe. */
export const FALLBACK_DISTRICT = 'Berlin';

/**
 * Ab hier steht niemand mehr in Berlin, und „das naechste 584 km von hier" ist
 * keine Auskunft, sondern eine Absage. Dann zaehlt wieder der Bezirk mit den
 * meisten verdeckten Karten — dieselbe Wahl wie ganz ohne Standort.
 *
 * Kein Versuch, die Stadtgrenze nachzuzeichnen: Berlin misst in der laengsten
 * Achse mehr als das, ein Wert, der jede Ecke abdeckt, wuerde auch Leipzig
 * einschliessen. 30 km trennt „ich bin in der Stadt" von „ich bin es nicht,
 * und die Entfernung sagt mir nichts".
 */
export const OUT_OF_TOWN_M = 30_000;

export interface NextMove {
  /** Die Karte, auf die der Weg zeigt (/map?me=<id>). */
  target: MapMustEat;
  district: string;
  /** Verdeckte Karten in genau diesem Bezirk, `target` mitgezaehlt. */
  covered: number;
  /** Luftlinie in Metern — null ohne Standort und ausserhalb der Stadt. */
  meters: number | null;
}

interface Input {
  /** Nur die eigenen Must Eats: was einem nicht gehoert, ist kein naechster Zug. */
  mustEats: MapMustEat[];
  faceUpIds: ReadonlySet<string>;
  districtOf: (m: MapMustEat) => string;
  location: { lat: number; lng: number } | null;
}

/**
 * Der eine naechste Zug — welche verdeckte Karte als naechstes drankommt, in
 * welchem Bezirk sie liegt und wie weit sie weg ist.
 *
 * Mit Standort entscheidet die Naehe: der Bezirk ist der der naechstgelegenen
 * verdeckten Karte, und die Zahl daneben zaehlt die verdeckten Karten genau
 * dort. Ein Bezirk mit acht verdeckten Karten am anderen Ende der Stadt ist
 * kein naechster Zug.
 *
 * Ohne (brauchbaren) Standort faellt die Wahl auf den Bezirk mit den meisten
 * verdeckten Karten — die beste Auskunft, die ohne Position zu haben ist. Bei
 * Gleichstand entscheidet der Name, damit dieselbe Sammlung nicht bei jedem
 * Aufruf einen anderen Bezirk nennt.
 *
 * `null` heisst: es gibt nichts aufzudecken. Der Aufrufer rendert dann nichts —
 * ein „du hast alles" waere eine Quittung, und die Seite stellt keine aus.
 */
export function pickNextMove({
  mustEats,
  faceUpIds,
  districtOf,
  location,
}: Input): NextMove | null {
  /* Dasselbe Praedikat wie das Deck darunter (`isAlbumMustEatCollected`):
     sonst zaehlt dieser Satz Karten als verdeckt, die zwei Zentimeter
     weiter offen liegen. */
  const covered = mustEats.filter((m) => !isAlbumMustEatCollected(m, faceUpIds));
  if (covered.length === 0) return null;

  if (location) {
    let nearest: MapMustEat | null = null;
    let nearestM = Infinity;
    for (const m of covered) {
      const d = haversineDistance(location.lat, location.lng, m.restaurant.lat, m.restaurant.lng);
      /* Ein Spot ohne Koordinaten ergibt NaN; jeder Vergleich damit ist
         falsch, er faellt hier also von selbst raus statt als „0 m" zu
         gewinnen. */
      if (d < nearestM) {
        nearestM = d;
        nearest = m;
      }
    }
    if (nearest && nearestM <= OUT_OF_TOWN_M) {
      const district = districtOf(nearest);
      return {
        target: nearest,
        district,
        covered: covered.filter((m) => districtOf(m) === district).length,
        meters: Math.round(nearestM),
      };
    }
  }

  const byDistrict = new Map<string, MapMustEat[]>();
  for (const m of covered) {
    const name = districtOf(m);
    const group = byDistrict.get(name);
    if (group) group.push(m);
    else byDistrict.set(name, [m]);
  }

  let district = '';
  let fullest: MapMustEat[] = [];
  for (const [name, group] of byDistrict) {
    const wins =
      group.length > fullest.length ||
      (group.length === fullest.length && name.localeCompare(district, 'de') < 0);
    if (wins) {
      district = name;
      fullest = group;
    }
  }

  /* Innerhalb des Bezirks die vorderste Karte — `order` ist die Nummer, die
     auf der Karte steht, und die `_id` haelt die Reihenfolge stabil, wo zwei
     Karten dieselbe tragen. */
  const target = [...fullest].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || a._id.localeCompare(b._id)
  )[0];

  return { target, district, covered: fullest.length, meters: null };
}
