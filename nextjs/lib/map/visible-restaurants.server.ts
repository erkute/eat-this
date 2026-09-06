import { ownsCategoryOf, type resolveEntitlements } from '@/lib/firebase/entitlements';
import { getSpotOfDayId } from '@/lib/home/spotOfDay.server';
import type { MapMustEat, MapRestaurant } from '@/lib/types';
import { composeRevealedMustEats } from './revealed-must-eats';
import { spotOfDayMustEatIds } from './spotOfDayReveal';

type Entitlements = Awaited<ReturnType<typeof resolveEntitlements>>;

/** Was ein Konto sieht — die eine Ableitung, die alle Aufrufer teilen. */
export interface AccountSurface {
  restaurants: MapRestaurant[];
  mustEats: MapMustEat[];
  /** Die Karten, die für dieses Konto offen liegen. */
  faceUpIds: Set<string>;
  /** Admin oder All-Berlin: jede Karte offen. */
  fullCatalog: boolean;
}

interface ComposeAccountSurfaceArgs {
  all: MapRestaurant[];
  allMustEats: MapMustEat[];
  ent: Entitlements;
  /** Aufdeckungen vor Ort aus users/{uid}/unlockedMustEats. */
  unlockedIds: ReadonlySet<string>;
  today?: string;
}

/**
 * Die Definition von „was gehört diesem Konto" — an genau EINER Stelle.
 *
 * Sie stand bis zum 31.08.2026 zweimal da: in /api/map-data und in
 * lib/profile/publicDeck.server.ts. Beide Kopien mussten dieselbe Antwort
 * geben, und keine hielt die andere fest — der Admin-Zweig fehlte in der
 * zweiten, das geteilte Deck meldete „0 von 24", während das Profil desselben
 * Kontos „24 von 24" zeigte. Der Fehler war still; er fällt nur auf, wenn
 * jemand beide Flächen nebeneinander hält.
 *
 * Seit dem 06.09.2026 entscheidet sie nur noch über Karten. Die Spots sind
 * frei — `restaurants` ist für jeden der ganze Katalog, und dass eine Karte
 * verdeckt danebenliegt, ist das Sichtbare, was von der Staffelung übrig ist.
 * Genau so soll es sein: ein Kartenrücken auf einem offenen Spot ist eine
 * Einladung hinzugehen, ein gesperrter Spot war eine Absage.
 *
 * Wer hier eine weitere Quelle offener Karten ergänzt, ergänzt sie überall.
 * Das ist der ganze Zweck.
 */
export async function composeAccountSurface({
  all,
  allMustEats,
  ent,
  unlockedIds,
  today = new Date().toISOString().slice(0, 10),
}: ComposeAccountSurfaceArgs): Promise<AccountSurface> {
  /* Admin und All-Berlin sehen jede Karte offen. Ein leeres Face-up-Set wäre
     hier still falsch: `isAlbumMustEatCollected` fällt dann auf das Bild
     zurück, und das hängt an einer Hydration, die nicht jeder Aufrufer macht. */
  if (ent.isAdmin || ent.hasAllBerlin) {
    return {
      restaurants: all,
      mustEats: allMustEats,
      faceUpIds: new Set(allMustEats.map((m) => m._id)),
      fullCatalog: true,
    };
  }

  const spotId = await getSpotOfDayId(today);

  /* Ein Kategorie-Pack wird LIVE aufgelöst, nicht aus dem Schnappschuss im
     Entitlement-Dokument. Der hält fest, welche Karten es beim Kauf gab; wer
     das Pizza-Pack kauft und drei Wochen später eine neue Pizza-Karte
     erscheinen sieht, hat sie mitgekauft. `ent.mustEatIds` bleibt daneben
     stehen: es trägt die Einzelkarten aus Einladungen, für die es keine
     Kategorie gibt. */
  const faceUpIds = new Set<string>([
    ...composeRevealedMustEats(allMustEats),
    ...spotOfDayMustEatIds(spotId, allMustEats),
    ...unlockedIds,
    ...ent.mustEatIds,
  ]);
  if (ent.categorySlugs.size > 0) {
    /* Die Kategorien hängen am Restaurant, nicht an der Karte —
       `mapMustEatsQuery` projiziert sie bewusst nicht mit. Also über den
       Katalog nachschlagen. */
    const owned = new Set(all.filter((r) => ownsCategoryOf(r, ent)).map((r) => r._id));
    for (const m of allMustEats) if (owned.has(m.restaurant._id)) faceUpIds.add(m._id);
  }

  return { restaurants: all, mustEats: allMustEats, faceUpIds, fullCatalog: false };
}
