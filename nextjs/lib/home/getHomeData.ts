import { client } from '@/lib/sanity'
import { getAllNewsArticles } from '@/lib/sanity.server'
import { getFreeSurfaceData } from '@/lib/map/free-surface'
import { categoryArt } from '@/lib/categoryArt'
import { pickSpotOfDay, type SpotCandidate } from './pickSpotOfDay'
import { assembleDistricts, pickWeeklyFeatureSlug, type DistrictRow } from './assembleDistricts'
export type { HubDistrict } from './assembleDistricts'

interface HomeSpot extends SpotCandidate {
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

interface HubCategory {
  name: string
  slug: string
  line: string | null
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
  districts: import('./assembleDistricts').HubDistrict[]
  magazine: HubArticle[]
  categoryNames: Record<string, string>
  categoryImages: Record<string, string>
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

// No spot tiles here — the district switcher renders name/count/tagline only.
// The old sticker-wall's per-district `spots` sub-projection (4 spots incl.
// images, ordered by a nested must-eat count) was dead payload in the home RSC
// stream and by far the most expensive part of this query; removed 2026-07.
const districtsQuery = `*[_type == "bezirk" && defined(slug.current)]{
  "name": name,
  "slug": slug.current,
  "tagline": select($locale == "en" => coalesce(descriptionEn, description), description),
  "count": count(*[_type == "restaurant" && isOpen == true && !(_id in path("drafts.**")) && references(^._id)])
}[count >= 5] | order(count desc)`

const categoryNamesQuery = `*[_type == "category" && defined(slug.current)]{
  "slug": slug.current,
  "name": select($locale == "en" => nameEn, name),
  "homeImage": select(
    defined(homeImage.asset) => homeImage.asset->url + "?w=560&h=720&fit=crop&auto=format&q=80",
    defined(homeImages[0].asset) => homeImages[0].asset->url + "?w=560&h=720&fit=crop&auto=format&q=80",
    defined(icon.asset) => icon.asset->url + "?w=560&h=720&fit=crop&auto=format&q=80"
  )
}`

/** Server: assemble the Hub's initial data. `today` defaults to the server's date. */
export async function getHomeData(
  locale: 'de' | 'en',
  today: string = new Date().toISOString().slice(0, 10),
): Promise<HomeData> {
  const [candidates, freeSurface, categories, districtRows, articles, catNameRows] = await Promise.all([
    client.fetch<HomeSpot[]>(spotCandidatesQuery, { locale }, { next: { revalidate: 3600, tags: ['restaurant', 'mustEat'] } }),
    // 60s-Modul-TTL (Sanity-Webhook flusht eager via invalidateFreeSurfaceCache)
    // — bewusst kürzer als die 1h-Next.js-Tag-Caches drumherum, konsistent mit
    // getInitialAnonMapData + /api/map-data.
    getFreeSurfaceData(),
    client.fetch<HubCategory[] | null>(homeWeekCategoriesQuery, { locale, today }, { next: { revalidate: 3600, tags: ['homeWeek'] } }),
    client.fetch<DistrictRow[]>(districtsQuery, { locale }, { next: { revalidate: 3600, tags: ['bezirk', 'restaurant', 'mustEat'] } }),
    getAllNewsArticles(),
    client.fetch<{ slug: string; name: string; homeImage?: string | null }[]>(categoryNamesQuery, { locale }, { next: { revalidate: 3600, tags: ['category'] } }),
  ])
  // a.title is already the EN base (or DE fallback) via the news GROQ coalesce;
  // a.titleDe is the German override. So de → titleDe||title, en → title.
  // Desktop renders the magazine as a 3-up grid → 6 fills two full rows
  // (4 would leave two empty cells in the second row).
  const magazine: HubArticle[] = articles.slice(0, 6).map((a) => ({
    title: locale === 'de' && a.titleDe ? a.titleDe : a.title,
    slug: a.slug,
    image: a.imageUrl ?? null,
    kicker: (locale === 'de' ? a.categoryLabelDe : a.categoryLabel) ?? a.categoryLabel ?? null,
  }))
  const categoryNames: Record<string, string> = Object.fromEntries((catNameRows ?? []).map((r) => [r.slug, r.name]))
  const categoryImages: Record<string, string> = Object.fromEntries(
    (catNameRows ?? [])
      .filter((r) => r.homeImage)
      .map((r) => [r.slug, r.homeImage as string])
  )
  // "Berlin nach Kategorien" renders a 2×2 grid on desktop → always show exactly
  // 4 so it fills both rows. The editorial homeWeek picks come first; if it has
  // fewer than 4, top up with other art-backed catalog categories (no tagline),
  // and if it has more, cap at 4.
  const baseCategories = categories ?? []
  const usedSlugs = new Set(baseCategories.map((c) => c.slug))
  const fillerCategories: HubCategory[] = (catNameRows ?? [])
    .filter((r) => !usedSlugs.has(r.slug) && categoryArt(r.slug) !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => ({ name: r.name, slug: r.slug, line: null }))
  const homeCategories: HubCategory[] = [...baseCategories, ...fillerCategories].slice(0, 4)
  // newOnMap kommt aus dem Free-Surface-Modul → exakt die Spots, die auf der
  // Map free sind, brand-deduped (1× Hokey Pokey statt 3 Filialen).
  // Desktop renders these in a 4-up grid → cap at 4 so it's exactly one full
  // row (5+ would spill a half-empty second row).
  const newOnMap: NewOnMapCard[] = freeSurface.newOnMap.slice(0, 4).map((c) => ({
    _id: c._id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    district: c.district,
    category: locale === 'en' ? (c.categoryEn ?? c.categoryDe) : c.categoryDe,
  }))
  // Unified district switcher: the weekly-rotated feature first (marked "★ Diese
  // Woche"), the rest by spot count. The rotation is deterministic per calendar
  // week — no homeWeek doc needed. Capped at 10 tabs.
  const featureSlug = pickWeeklyFeatureSlug(districtRows ?? [], today)
  const districts = assembleDistricts(featureSlug, districtRows ?? [])
  return { spotOfDay: pickSpotOfDay(candidates, today), newOnMap, categories: homeCategories, districts, magazine, categoryNames, categoryImages }
}
