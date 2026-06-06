import { client } from '@/lib/sanity'
import { getAllNewsArticles, getAllBezirkeWithStats } from '@/lib/sanity.server'
import { getFreeSurfaceData } from '@/lib/map/free-surface'
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

interface HubBezirkSpot {
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

export interface HubBezirkChip {
  name: string
  slug: string
  count: number
}

export interface HomeData {
  spotOfDay: HomeSpot | null
  newOnMap: NewOnMapCard[]
  categories: HubCategory[]
  bezirkOfWeek: HubBezirk | null
  bezirke: HubBezirkChip[]
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
  const [candidates, freeSurface, categories, bezirkOfWeek, articles, catNameRows, bezirkRows] = await Promise.all([
    client.fetch<HomeSpot[]>(spotCandidatesQuery, { locale }, { next: { revalidate: 3600, tags: ['restaurant', 'mustEat'] } }),
    // 60s-Modul-TTL (Sanity-Webhook flusht eager via invalidateFreeSurfaceCache)
    // — bewusst kürzer als die 1h-Next.js-Tag-Caches drumherum, konsistent mit
    // getInitialAnonMapData + /api/map-data.
    getFreeSurfaceData(),
    client.fetch<HubCategory[] | null>(homeWeekCategoriesQuery, { locale, today }, { next: { revalidate: 3600, tags: ['homeWeek'] } }),
    client.fetch<HubBezirk | null>(bezirkOfWeekQuery, { locale, today }, { next: { revalidate: 3600, tags: ['homeWeek'] } }),
    getAllNewsArticles(),
    client.fetch<{ slug: string; name: string }[]>(categoryNamesQuery, { locale }, { next: { revalidate: 3600, tags: ['category'] } }),
    getAllBezirkeWithStats(),
  ])
  // Browse-by-district chips → /map?bezirk=. Only districts with a real
  // selection (≥5 open spots) — a near-empty filter would be a dead end.
  // Most-populated first.
  const bezirke: HubBezirkChip[] = (bezirkRows ?? [])
    .filter((b) => b.slug && (b.restaurantCount ?? 0) >= 5)
    .sort((a, b) => (b.restaurantCount ?? 0) - (a.restaurantCount ?? 0))
    .map((b) => ({ name: b.name, slug: b.slug, count: b.restaurantCount ?? 0 }))
  // a.title is already the EN base (or DE fallback) via the news GROQ coalesce;
  // a.titleDe is the German override. So de → titleDe||title, en → title.
  const magazine: HubArticle[] = articles.slice(0, 4).map((a) => ({
    title: locale === 'de' && a.titleDe ? a.titleDe : a.title,
    slug: a.slug,
    image: a.imageUrl ?? null,
    kicker: (locale === 'de' ? a.categoryLabelDe : a.categoryLabel) ?? a.categoryLabel ?? null,
  }))
  const categoryNames: Record<string, string> = Object.fromEntries((catNameRows ?? []).map((r) => [r.slug, r.name]))
  // newOnMap kommt aus dem Free-Surface-Modul → exakt die Spots, die auf der
  // Map free sind, brand-deduped (1× Hokey Pokey statt 3 Filialen).
  const newOnMap: NewOnMapCard[] = freeSurface.newOnMap.map((c) => ({
    _id: c._id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    district: c.district,
    category: locale === 'en' ? (c.categoryEn ?? c.categoryDe) : c.categoryDe,
  }))
  return { spotOfDay: pickSpotOfDay(candidates, today), newOnMap, categories: categories ?? [], bezirkOfWeek, bezirke, magazine, categoryNames }
}
