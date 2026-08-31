import type { resolveEntitlements } from '@/lib/firebase/entitlements';
import { isRestaurantVisible } from '@/lib/firebase/entitlements';
import { getSpotOfDayId } from '@/lib/home/spotOfDay.server';
import type { MapMustEat, MapRestaurant } from '@/lib/types';
import { applyFreeSurface } from './free-surface';
import { applySpotOfDayReveal } from './spotOfDayReveal';
import {
  composeAnonRestaurants,
  composeRevealedMustEats,
  composeSignedRestaurants,
} from './tier-composition';

type Entitlements = Awaited<ReturnType<typeof resolveEntitlements>>;

interface ComposeVisibleRestaurantsArgs {
  all: MapRestaurant[];
  allMustEats: MapMustEat[];
  ent: Entitlements;
  uid: string | null;
  freeRestaurantIds: Set<string>;
  today?: string;
}

interface VisibleRestaurantsResult {
  restaurants: MapRestaurant[];
  lockedRestaurants: MapRestaurant[];
  mustEats: MapMustEat[];
  revealedMustEatIds: Set<string>;
}

export async function composeVisibleRestaurants({
  all,
  allMustEats,
  ent,
  uid,
  freeRestaurantIds,
  today = new Date().toISOString().slice(0, 10),
}: ComposeVisibleRestaurantsArgs): Promise<VisibleRestaurantsResult> {
  const spotIdPromise = getSpotOfDayId(today);

  const mustEatCountByRestaurant = new Map<string, number>();
  for (const m of allMustEats) {
    const rid = m.restaurant._id;
    mustEatCountByRestaurant.set(rid, (mustEatCountByRestaurant.get(rid) ?? 0) + 1);
  }

  const anonSet = composeAnonRestaurants(all, mustEatCountByRestaurant);
  const anonIds = new Set(anonSet.map((r) => r._id));
  const revealedSet = composeRevealedMustEats(allMustEats, anonIds);

  const signedSet = composeSignedRestaurants(all, anonIds, mustEatCountByRestaurant);

  let visibleRestaurants: MapRestaurant[];
  if (!uid) {
    visibleRestaurants = anonSet;
  } else {
    const tierUnion = [...anonSet, ...signedSet];
    const tierUnionIds = new Set(tierUnion.map((r) => r._id));

    const restaurantIdsFromMustEats = new Set<string>();
    if (ent.mustEatIds.size > 0) {
      for (const m of allMustEats) {
        if (ent.mustEatIds.has(m._id)) restaurantIdsFromMustEats.add(m.restaurant._id);
      }
    }

    const hasIndividualEntitlements =
      ent.categorySlugs.size > 0 ||
      ent.restaurantIds.size > 0 ||
      restaurantIdsFromMustEats.size > 0;

    if (hasIndividualEntitlements) {
      const matched = all.filter(
        (r) =>
          !tierUnionIds.has(r._id) &&
          (isRestaurantVisible(r, ent) || restaurantIdsFromMustEats.has(r._id))
      );
      visibleRestaurants = [...tierUnion, ...matched];
    } else {
      visibleRestaurants = tierUnion;
    }
  }

  visibleRestaurants = applyFreeSurface(visibleRestaurants, all, freeRestaurantIds);

  const visibleIdSet = new Set(visibleRestaurants.map((r) => r._id));
  const visibleMustEats = allMustEats.filter((m) => visibleIdSet.has(m.restaurant._id));
  const lockedRestaurants = all.filter((r) => !visibleIdSet.has(r._id));

  const spotId = await spotIdPromise;
  return applySpotOfDayReveal(spotId, all, allMustEats, {
    restaurants: visibleRestaurants,
    lockedRestaurants,
    mustEats: visibleMustEats,
    revealedMustEatIds: revealedSet,
  });
}

/** Was ein Konto sieht — die eine Ableitung, die alle Aufrufer teilen. */
export interface AccountSurface {
  restaurants: MapRestaurant[];
  lockedRestaurants: MapRestaurant[];
  mustEats: MapMustEat[];
  /** Die Karten, die fuer dieses Konto offen liegen. */
  faceUpIds: Set<string>;
  /** Admin oder All-Berlin: ganzer Katalog, alles offen. */
  fullCatalog: boolean;
}

/**
 * Die Definition von „was gehoert diesem Konto und was liegt offen" — an genau
 * EINER Stelle.
 *
 * Sie stand bis zum 31.08.2026 zweimal da: in /api/map-data (fuer die Karte und
 * das eigene Profil) und in lib/profile/publicDeck.server.ts (fuer das geteilte
 * Deck). Beide Kopien mussten dieselbe Antwort geben, und kein Test hielt sie
 * zusammen — der Deck-Test mockte `composeVisibleRestaurants` und baute die
 * Mengen selbst.
 *
 * Sie sind auch prompt auseinandergelaufen: der Admin-Zweig fehlte in der
 * zweiten Kopie, das geteilte Deck meldete „0 von 24", waehrend das Profil
 * desselben Kontos „24 von 24" zeigte. Der Fehler war still — er faellt nur
 * auf, wenn jemand beide Flaechen nebeneinander haelt.
 *
 * Wer hier eine vierte Quelle offener Karten ergaenzt, ergaenzt sie damit
 * ueberall. Das ist der ganze Zweck.
 */
export async function composeAccountSurface({
  all,
  allMustEats,
  ent,
  uid,
  freeRestaurantIds,
  unlockedIds,
  today,
}: ComposeVisibleRestaurantsArgs & {
  /** Aufdeckungen vor Ort aus users/{uid}/unlockedMustEats. */
  unlockedIds: ReadonlySet<string>;
}): Promise<AccountSurface> {
  /* Admin und All-Berlin sehen den ganzen Katalog, und zwar offen. Ein leeres
     Face-up-Set waere hier still falsch: `isAlbumMustEatCollected` faellt dann
     auf das Bild zurueck, und das haengt an einer Hydration, die nicht jeder
     Aufrufer macht. */
  if (ent.isAdmin || ent.hasAllBerlin) {
    return {
      restaurants: all,
      lockedRestaurants: [],
      mustEats: allMustEats,
      faceUpIds: new Set(allMustEats.map((m) => m._id)),
      fullCatalog: true,
    };
  }

  const visible = await composeVisibleRestaurants({
    all,
    allMustEats,
    ent,
    uid,
    freeRestaurantIds,
    today,
  });

  return {
    restaurants: visible.restaurants,
    lockedRestaurants: visible.lockedRestaurants,
    mustEats: visible.mustEats,
    /* Offen fuer dieses Konto: kuratierte Aufdeckungen und Spot-des-Tages,
       eigene Aufdeckungen vor Ort, gekaufte Karten. */
    faceUpIds: new Set([...visible.revealedMustEatIds, ...unlockedIds, ...ent.mustEatIds]),
    fullCatalog: false,
  };
}
