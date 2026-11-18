import { ownsCategoryOf, type resolveEntitlements } from '@/lib/firebase/entitlements';
import type { MapMustEat, MapRestaurant } from '@/lib/types';
import { composeRevealedMustEats } from './revealed-must-eats';

type Entitlements = Awaited<ReturnType<typeof resolveEntitlements>>;

/** Was ein Konto sieht — die eine Ableitung, die alle Aufrufer teilen. */
interface AccountSurface {
  restaurants: MapRestaurant[];
  /** Die Karten, die für dieses Konto offen liegen. Der Stapel selbst ist für
   *  jeden derselbe — `allMustEats` des Aufrufers. */
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
}

/**
 * Die Definition von „was gehört diesem Konto", an genau einer Stelle, für
 * /api/map-data und lib/profile/publicDeck.server.ts. Zwei Kopien laufen still
 * auseinander: Fehlt der Admin-Zweig in einer, meldet das geteilte Deck „0 von
 * 24", während das Profil desselben Kontos „24 von 24" zeigt.
 *
 * Sie entscheidet nur über Karten. Die Spots sind frei: `restaurants` ist für
 * jeden der ganze Katalog, und dass eine Karte verdeckt danebenliegt, ist das
 * Sichtbare an der Staffelung. Ein Kartenrücken auf einem offenen Spot ist eine
 * Einladung hinzugehen.
 *
 * Wer hier eine weitere Quelle offener Karten ergänzt, ergänzt sie überall. Das
 * ist der ganze Zweck.
 */
export async function composeAccountSurface({
  all,
  allMustEats,
  ent,
  unlockedIds,
}: ComposeAccountSurfaceArgs): Promise<AccountSurface> {
  /* Admin und All-Berlin sehen jede Karte offen. Ein leeres Face-up-Set wäre
     hier still falsch: `isAlbumMustEatCollected` fällt dann auf das Bild
     zurück, und das hängt an einer Hydration, die nicht jeder Aufrufer macht. */
  if (ent.isAdmin || ent.hasAllBerlin) {
    return {
      restaurants: all,
      faceUpIds: new Set(allMustEats.map((m) => m._id)),
      fullCatalog: true,
    };
  }

  /* Ein Kategorie-Pack wird LIVE aufgelöst, nicht aus dem Schnappschuss im
     Entitlement-Dokument. Der hält fest, welche Karten es beim Kauf gab; wer
     das Pizza-Pack kauft und drei Wochen später eine neue Pizza-Karte
     erscheinen sieht, hat sie mitgekauft. `ent.mustEatIds` bleibt daneben
     stehen: es trägt die Einzelkarten aus Einladungen, für die es keine
     Kategorie gibt. */
  const faceUpIds = new Set<string>([
    ...composeRevealedMustEats(allMustEats),
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

  /* Jeder sieht den ganzen Stapel; gestaffelt ist nur, was davon offen liegt.
     Gericht, Bild und Beschreibung verdeckter Karten bleiben auf dem Server
     (stripCoveredMustEats); was der Rücken preisgibt, ist der Spot, und der
     steht ohnehin frei auf der Map.

     Ein Konto sieht also nicht nur seine eigenen Karten: Der Bestand wächst
     ständig, und das „x von …" im Profil zählt gegen alle. Sonst schrumpfte das
     Deck beim Anmelden, und jede neue Karte bliebe für bestehende Konten
     unsichtbar. */
  return { restaurants: all, faceUpIds, fullCatalog: false };
}
