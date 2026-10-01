// Exactly what the pick reads — nothing else. `featured` and `mustEatCount`
// used to sit here too, and both queries below dutifully computed them; no
// branch ever looked at either. The mustEatCount one was a correlated
// subquery over every restaurant, run twice per page.
export interface SpotCandidate {
  _id: string;
  featuredOnDate: string | null;
}

/**
 * Spot-des-Tages selection: a manually dated curation (`featuredOnDate ==
 * today`) always wins. Otherwise a NEW spot is surfaced every day via a
 * deterministic date-keyed rotation over a stable order — so the spot of the
 * day genuinely changes daily and yesterday's steps back (it's purely derived
 * from `today`, nothing is stored). `today` is an ISO date string (YYYY-MM-DD).
 */
export function pickSpotOfDay<T extends SpotCandidate>(candidates: T[], today: string): T | null {
  if (candidates.length === 0) return null;
  const dated = candidates.find((c) => c.featuredOnDate === today);
  if (dated) return dated;
  const sorted = [...candidates].sort((a, b) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0));
  const epochDay = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86_400_000);
  if (!Number.isFinite(epochDay)) return sorted[0];
  const idx = ((epochDay % sorted.length) + sorted.length) % sorted.length;
  return sorted[idx];
}

/** The ISO date (YYYY-MM-DD) before `day`, in UTC like the pick itself. */
export function previousDay(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
