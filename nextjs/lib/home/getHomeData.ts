import { client } from '@/lib/sanity'
import { pickSpotOfDay, type SpotCandidate } from './pickSpotOfDay'

export interface HomeSpot extends SpotCandidate {
  name: string
  slug: string
  image: string | null
  district: string | null
}

export interface HomeData {
  spotOfDay: HomeSpot | null
}

const spotCandidatesQuery = `*[_type == "restaurant" && isOpen == true && !(_id in path("drafts.**"))]{
  _id,
  "name": name,
  "slug": slug.current,
  featuredOnDate,
  featured,
  "image": image.asset->url,
  "district": coalesce(bezirkRef->name, district, null),
  "mustEatCount": count(*[_type == "mustEat" && references(^._id)])
}`

/** Server: assemble the Hub's initial data. `today` defaults to the server's date. */
export async function getHomeData(
  _locale: 'de' | 'en',
  today: string = new Date().toISOString().slice(0, 10),
): Promise<HomeData> {
  const candidates = await client.fetch<HomeSpot[]>(
    spotCandidatesQuery,
    {},
    { next: { revalidate: 3600, tags: ['restaurant', 'mustEat'] } },
  )
  return { spotOfDay: pickSpotOfDay(candidates, today) }
}
