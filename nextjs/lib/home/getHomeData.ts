import { client } from '@/lib/sanity'
import { getAllNewsArticles } from '@/lib/sanity.server'
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

export interface HubCategory {
  name: string
  slug: string
  line: string | null
}

export interface HubBezirkSpot {
  _id: string
  name: string
  slug: string
  image: string | null
  category: string | null
}

export interface HubBezirk {
  name: string
  slug: string
  tagline: string | null
  spots: HubBezirkSpot[]
}

export interface HubArticle {
  title: string
  slug: string
  image: string | null
  kicker: string | null
}

export interface HomeData {
  spotOfDay: HomeSpot | null
  newOnMap: NewOnMapCard[]
  categories: HubCategory[]
  bezirkOfWeek: HubBezirk | null
  magazine: HubArticle[]
  categoryNames: Record<string, string>
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

const homeWeekCategoriesQuery = `*[_type == "homeWeek" && weekStart <= $today] | order(weekStart desc)[0].categories[]{
  "name": select($locale == "en" => category->nameEn, category->name),
  "slug": category->slug.current,
  line
}`

const bezirkOfWeekQuery = `*[_type == "homeWeek" && weekStart <= $today] | order(weekStart desc)[0]{
  "name": bezirk->name,
  "slug": bezirk->slug.current,
  "tagline": bezirkTagline,
  "spots": bezirkSpots[]->{
    _id,
    "name": name,
    "slug": slug.current,
    "image": image.asset->url,
    "category": select($locale == "en" => categories[0]->nameEn, categories[0]->name)
  }
}`

const categoryNamesQuery = `*[_type == "category" && defined(slug.current)]{
  "slug": slug.current,
  "name": select($locale == "en" => nameEn, name)
}`

/** Server: assemble the Hub's initial data. `today` defaults to the server's date. */
export async function getHomeData(
  locale: 'de' | 'en',
  today: string = new Date().toISOString().slice(0, 10),
): Promise<HomeData> {
  const [candidates, newOnMap, categories, bezirkOfWeek, articles, catNameRows] = await Promise.all([
    client.fetch<HomeSpot[]>(spotCandidatesQuery, { locale }, { next: { revalidate: 3600, tags: ['restaurant', 'mustEat'] } }),
    client.fetch<NewOnMapCard[]>(newOnMapQuery, { locale }, { next: { revalidate: 3600, tags: ['restaurant'] } }),
    client.fetch<HubCategory[] | null>(homeWeekCategoriesQuery, { locale, today }, { next: { revalidate: 3600, tags: ['homeWeek'] } }),
    client.fetch<HubBezirk | null>(bezirkOfWeekQuery, { locale, today }, { next: { revalidate: 3600, tags: ['homeWeek'] } }),
    getAllNewsArticles(),
    client.fetch<{ slug: string; name: string }[]>(categoryNamesQuery, { locale }, { next: { revalidate: 3600, tags: ['category'] } }),
  ])
  // a.title is already the EN base (or DE fallback) via the news GROQ coalesce;
  // a.titleDe is the German override. So de → titleDe||title, en → title.
  const magazine: HubArticle[] = articles.slice(0, 4).map((a) => ({
    title: locale === 'de' && a.titleDe ? a.titleDe : a.title,
    slug: a.slug,
    image: a.imageUrl ?? null,
    kicker: (locale === 'de' ? a.categoryLabelDe : a.categoryLabel) ?? a.categoryLabel ?? null,
  }))
  const categoryNames: Record<string, string> = Object.fromEntries((catNameRows ?? []).map((r) => [r.slug, r.name]))
  return { spotOfDay: pickSpotOfDay(candidates, today), newOnMap, categories: categories ?? [], bezirkOfWeek, magazine, categoryNames }
}
