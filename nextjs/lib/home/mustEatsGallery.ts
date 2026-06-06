import type { MapMustEat } from '@/lib/types'

export type MustEatFilter = 'all' | 'open' | 'locked'

/** Partition must-eats into face-up (in the unlocked set) and face-down,
 *  preserving the original order within each bucket. */
export function splitMustEats(mustEats: MapMustEat[], unlockedIds: Set<string>) {
  const open: MapMustEat[] = []
  const locked: MapMustEat[] = []
  for (const m of mustEats) (unlockedIds.has(m._id) ? open : locked).push(m)
  return { open, locked }
}

/** Apply the gallery filter chip. 'all' returns the input list as-is. */
export function filterMustEats(
  mustEats: MapMustEat[],
  unlockedIds: Set<string>,
  filter: MustEatFilter,
): MapMustEat[] {
  if (filter === 'all') return mustEats
  const wantOpen = filter === 'open'
  return mustEats.filter((m) => unlockedIds.has(m._id) === wantOpen)
}

/** Pick the demo card for the Must-Eats onboarding overlay: the first
 *  face-up must-eat (anon view), falling back to the first card at all.
 *  Null when the catalog is empty — the overlay then shows the card back. */
export function pickOnboardingDemoCard(
  mustEats: MapMustEat[],
  unlockedIds: Set<string>,
): MapMustEat | null {
  return mustEats.find((m) => unlockedIds.has(m._id)) ?? mustEats[0] ?? null
}
