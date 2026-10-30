// NOTE on the type source: the spec asked to import `MustEatPreview` from
// `@/lib/sanity.server`, but that type is deliberately content-free
// (`{ _id, order? }`) — its header forbids adding dish/photo fields because
// they would leak through the public restaurant page's RSC payload. The album
// needs the *face-up* content shape (dish/image), which is the same data the
// map exposes as `MapMustEat`.
import type { MapMustEat } from '@/lib/types';
import { sortByCardNumber } from '@/lib/map/cardOrder';

interface AlbumSlot {
  /** Die Nummer, die unten rechts auf der Karte steht — `order` aus Sanity,
   *  dreistellig wie im Druck. Ein leerer Platz mit erfundener Nummer wäre
   *  schlimmer als einer ohne — er schickt einen mit der falschen Zahl auf die
   *  Suche. Null, wo ein Dokument keine `order` trägt. */
  no: string | null;
  id: string;
  collected: boolean;
  mustEat: MapMustEat | null;
  /** Das Lokal, in dem diese Karte liegt — auch bei verdeckten Plaetzen.
   *  `mustEat` ist dort bewusst null (kein Gericht, kein Bild), aber Name
   *  und Slug des Spots sind keine bezahlten Angaben: beide stehen auf der
   *  Map. Ohne sie waere ein leerer Album-Platz nur ein Loch statt einer
   *  Aufgabe — und ohne Weg dorthin. */
  where: string | null;
  slug: string | null;
  /** Der Bezirk des Lokals, wie ihn der Aufrufer zählt (`groupOf`). Wie `where`
   *  keine bezahlte Angabe: er steht auf der Map. */
  district: string;
  /** Das Lokal selbst — der Schlüssel der gemerkten Spots. */
  restaurantId: string | null;
}

/** Ein Bezirk: eine Seite im Album. Wer die Gruppen stellt, entscheidet der
 *  Aufrufer über `groupOf`. */
interface AlbumGroup {
  group: string;
  slots: AlbumSlot[];
}

interface Album {
  /** Alle Plaetze in Kartenreihenfolge — 001, 002, 003 …, wie der Stapel
   *  selbst. Das Raster laeuft durch, die Bezirke filtern nur. */
  slots: AlbumSlot[];
  /** Dieselben Plaetze nach Bezirk, alphabetisch, fuer die Reiterleiste. */
  groups: AlbumGroup[];
}

/* MapMustEat.restaurant traegt ein district — das reicht als Rueckfall, wenn
   der Aufrufer nichts Besseres weiss. */
/* Ein Spot ohne gepflegten Bezirk faellt nicht raus, er sammelt sich unter der Stadt. */
export const FALLBACK_DISTRICT = 'Berlin';

const defaultGroupOf = (m: MapMustEat): string => m.restaurant?.district ?? FALLBACK_DISTRICT;

function isAlbumMustEatCollected(mustEat: MapMustEat, faceUpIds: ReadonlySet<string>): boolean {
  return faceUpIds.has(mustEat._id) || Boolean(mustEat.image);
}

export function buildAlbum(
  all: MapMustEat[],
  faceUpIds: Set<string>,
  groupOf: (m: MapMustEat) => string = defaultGroupOf
): Album {
  /* Nach der Kartennummer, nicht nach Bezirk. Solange die Bezirke eigene
     Abschnitte hatten, musste die Sortierung sie zusammenhalten; seit sie
     Reiter sind, ist das Raster EIN Stapel — und ein Stapel liegt in seiner
     eigenen Reihenfolge. `_id` bleibt der letzte Notnagel, damit ein
     Must-Eat ohne `order` trotzdem fest liegt. */
  const sorted = sortByCardNumber(all);

  const slots: AlbumSlot[] = sorted.map((m) => {
    const collected = isAlbumMustEatCollected(m, faceUpIds);
    return {
      no: m.order == null ? null : String(m.order).padStart(3, '0'),
      id: m._id,
      collected,
      mustEat: collected ? m : null,
      where: m.restaurant?.name ?? null,
      slug: m.restaurant?.slug ?? null,
      district: groupOf(m),
      restaurantId: m.restaurant?._id ?? null,
    };
  });

  const byGroup = new Map<string, AlbumSlot[]>();
  sorted.forEach((m, i) => {
    const name = groupOf(m);
    const bucket = byGroup.get(name);
    if (bucket) bucket.push(slots[i]);
    else byGroup.set(name, [slots[i]]);
  });

  const groups = [...byGroup.entries()]
    .map(([group, groupSlots]) => ({ group, slots: groupSlots }))
    .sort((a, b) => a.group.localeCompare(b.group, 'de'));

  return { slots, groups };
}
