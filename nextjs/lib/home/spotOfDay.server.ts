import { client } from '@/lib/sanity'
import { pickSpotOfDay } from './pickSpotOfDay'

// Same candidate filter as getHomeData's spotCandidatesQuery (open, non-draft)
// so the id resolved here is ALWAYS the same spot the hub hero shows — the map
// must free-reveal exactly that one, not a different pick.
const spotOfDayCandidatesQuery = `*[_type == "restaurant" && isOpen == true && !(_id in path("drafts.**"))]{
  _id,
  featuredOnDate,
  "featured": featured == true,
  "mustEatCount": count(*[_type == "mustEat" && references(^._id)])
}`

interface Candidate {
  _id: string
  featuredOnDate: string | null
  featured: boolean
  mustEatCount: number
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
    { next: { revalidate: 3600, tags: ['restaurant', 'mustEat'] } },
  )
  return pickSpotOfDay(candidates, today)?._id ?? null
}
