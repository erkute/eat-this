import { client } from '@/lib/sanity';
import { SANITY_REVALIDATE_SECONDS } from '@/lib/constants';
import { pickSpotOfDay } from './pickSpotOfDay';

// Candidates: every open, non-draft restaurant. The pick turns that spot's
// Must-Eat cards face up on the map for the day (spotOfDayReveal.ts); the
// home page no longer shows it (Spot des Tages left the home on 01.10.2026).
const spotOfDayCandidatesQuery = `*[_type == "restaurant" && isOpen == true && isClosed != true && !(_id in path("drafts.**"))]{
  _id,
  featuredOnDate
}`;

interface Candidate {
  _id: string;
  featuredOnDate: string | null;
}

/**
 * Canonical Spot-des-Tages restaurant id for `today` (YYYY-MM-DD). The query
 * result is cached, but the date-keyed pick runs per call, so the spot still
 * rotates daily. Returns null if there are no candidates.
 */
export async function getSpotOfDayId(today: string): Promise<string | null> {
  const candidates = await client.fetch<Candidate[]>(
    spotOfDayCandidatesQuery,
    {},
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['restaurant', 'mustEat'] } }
  );
  return pickSpotOfDay(candidates, today)?._id ?? null;
}
