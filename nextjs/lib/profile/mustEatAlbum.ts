// NOTE on the type source: the spec asked to import `MustEatPreview` from
// `@/lib/sanity.server`, but that type is deliberately content-free
// (`{ _id, order? }`) — its header forbids adding dish/photo fields because
// they would leak through the public restaurant page's RSC payload. The album
// needs the *face-up* content shape (dish/image), which is the same data the
// map exposes as `MapMustEat`.
import type { MapMustEat } from '@/lib/types';

interface AlbumSlot {
  no: number;
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
}

/** Ein Abschnitt der Sammlung — bisher nach Kategorie, seit 31.08.2026 nach
 *  Bezirk. Wer die Gruppen stellt, entscheidet der Aufrufer über `groupOf`. */
interface AlbumGroup {
  group: string;
  slots: AlbumSlot[];
}

/* MapMustEat.restaurant traegt ein district — das reicht als Rueckfall, wenn
   der Aufrufer nichts Besseres weiss. */
const defaultGroupOf = (m: MapMustEat): string => m.restaurant?.district ?? 'Berlin';

export function isAlbumMustEatCollected(
  mustEat: MapMustEat,
  faceUpIds: ReadonlySet<string>
): boolean {
  return faceUpIds.has(mustEat._id) || Boolean(mustEat.image);
}

export function buildAlbum(
  all: MapMustEat[],
  faceUpIds: Set<string>,
  groupOf: (m: MapMustEat) => string = defaultGroupOf
): AlbumGroup[] {
  /* Innerhalb einer Gruppe entscheidet die Kartennummer — die Zahl unten
     rechts auf jeder Karte. Der Rueckfall war bis zum 31.08.2026 die
     Dokument-ID: stabil, aber willkuerlich, und die Sammlung ist die eine
     Flaeche, auf der jemand diese Zahlen wirklich liest. `_id` bleibt als
     letzter Notnagel, damit ein Must-Eat ohne `order` trotzdem fest liegt. */
  const sorted = [...all].sort((a, b) => {
    const c = groupOf(a).localeCompare(groupOf(b), 'de');
    if (c !== 0) return c;
    const n = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
    return n !== 0 ? n : a._id.localeCompare(b._id);
  });
  const groups: AlbumGroup[] = [];
  sorted.forEach((m, i) => {
    const name = groupOf(m);
    const collected = isAlbumMustEatCollected(m, faceUpIds);
    const slot: AlbumSlot = {
      no: i + 1,
      id: m._id,
      collected,
      mustEat: collected ? m : null,
      where: m.restaurant?.name ?? null,
      slug: m.restaurant?.slug ?? null,
    };
    const last = groups[groups.length - 1];
    if (last && last.group === name) last.slots.push(slot);
    else groups.push({ group: name, slots: [slot] });
  });
  return groups;
}
