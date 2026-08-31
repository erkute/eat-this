import type { MapMustEat } from '@/lib/types';

export interface TeaserCard {
  mustEat: MapMustEat;
  faceUp: boolean;
}

/** Compose the home teaser row: face-down cards with face-up ones at
 *  `faceUpSlots`.
 *
 *  A Must Eat is a card because it has two states, so a row of six face-up
 *  cards shows none of the mechanic — it reads as six framed photos, which is
 *  what made visitors ask why the dishes are on cards at all. The contrast is
 *  the explanation.
 *
 *  Either kind can run out (a signed-in visitor who unlocked everything, an
 *  anonymous one on a thin catalog); the remaining slots then take whatever is
 *  left rather than rendering a short row.
 */
export function composeTeaserCards(
  mustEats: MapMustEat[],
  faceUpIds: ReadonlySet<string>,
  total: number,
  faceUpSlots: readonly number[]
): TeaserCard[] {
  const up = mustEats.filter((m) => faceUpIds.has(m._id));
  const down = mustEats.filter((m) => !faceUpIds.has(m._id));
  const row: TeaserCard[] = [];

  for (let slot = 0; slot < total; slot += 1) {
    const preferred = faceUpSlots.includes(slot) ? up : down;
    const fallback = preferred === up ? down : up;
    const next = preferred.shift() ?? fallback.shift();
    if (!next) break;
    row.push({ mustEat: next, faceUp: faceUpIds.has(next._id) });
  }

  return row;
}

/** Pick the demo card for the Must-Eats onboarding overlay: the first
 *  face-up must-eat (anon view), falling back to the first card at all.
 *  Null when the catalog is empty — the overlay then shows the card back. */
export function pickOnboardingDemoCard(
  mustEats: MapMustEat[],
  unlockedIds: Set<string>
): MapMustEat | null {
  return mustEats.find((m) => unlockedIds.has(m._id)) ?? mustEats[0] ?? null;
}
