import { client } from '@/lib/sanity'
import { pickSpotOfDay, type SpotCandidate } from './pickSpotOfDay'

export interface HomeSpot extends SpotCandidate {
  name: string
  slug: string
  image: string | null
  district: string | null
  sub: string | null
}

export interface NewOnMapCard {
  _id: string
  name: string
  slug: string
  image: string | null
  district: string | null
  category: string | null
}

export interface HomeData {
  spotOfDay: HomeSpot | null
  newOnMap: NewOnMapCard[]
}

const spotCandidatesQuery = `*[_type == "restaurant" && isOpen == true && !(_id in path("drafts.**"))]{
  _id,
  "name": name,
  "slug": slug.current,
  featuredOnDate,
  featured,
  "image": image.asset->url,
  "district": coalesce(bezirkRef->name, district, null),
  "sub": select($locale == "en" => coalesce(shortDescriptionEn, shortDescription), shortDescription),
  "mustEatCount": count(*[_type == "mustEat" && references(^._id)])
}`

const newOnMapQuery = `*[_type == "restaurant" && isOpen == true && defined(image) && !(_id in path("drafts.**"))] | order(_createdAt desc)[0...6]{
  _id,
  "name": name,
  "slug": slug.current,
  "image": image.asset->url,
  "district": coalesce(bezirkRef->name, district, null),
  "category": select($locale == "en" => categories[0]->nameEn, categories[0]->name)
}`

/** Server: assemble the Hub's initial data. `today` defaults to the server's date. */
export async function getHomeData(
  locale: 'de' | 'en',
  today: string = new Date().toISOString().slice(0, 10),
): Promise<HomeData> {
  const [candidates, newOnMap] = await Promise.all([
    client.fetch<HomeSpot[]>(spotCandidatesQuery, { locale }, { next: { revalidate: 3600, tags: ['restaurant', 'mustEat'] } }),
    client.fetch<NewOnMapCard[]>(newOnMapQuery, { locale }, { next: { revalidate: 3600, tags: ['restaurant'] } }),
  ])
  return { spotOfDay: pickSpotOfDay(candidates, today), newOnMap }
}
