import { client } from '@/lib/sanity'
import { getLatestNewsArticles } from '@/lib/sanity.server'
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

export interface HubArticle {
  title: string
  slug: string
  image: string | null
  kicker: string | null
}

export interface HomeData {
  spotOfDay: HomeSpot | null
  districts: import('./assembleDistricts').HubDistrict[]
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
  "name": select($locale == "en" => nameEn, name)
}`

/** Server: assemble the Hub's initial data. `today` defaults to the server's date. */
export async function getHomeData(
  locale: 'de' | 'en',
  today: string = new Date().toISOString().slice(0, 10),
): Promise<HomeData> {
  const [candidates, districtRows, articles, catNameRows] = await Promise.all([
    client.fetch<HomeSpot[]>(spotCandidatesQuery, { locale }, { next: { revalidate: 3600, tags: ['restaurant', 'mustEat'] } }),
    client.fetch<DistrictRow[]>(districtsQuery, { locale }, { next: { revalidate: 3600, tags: ['bezirk', 'restaurant', 'mustEat'] } }),
    getLatestNewsArticles(6),
    client.fetch<{ slug: string; name: string }[]>(categoryNamesQuery, { locale }, { next: { revalidate: 3600, tags: ['category'] } }),
  ])
  // a.title is already the EN base (or DE fallback) via the news GROQ coalesce;
  // a.titleDe is the German override. So de → titleDe||title, en → title.
  // Desktop renders the magazine as a 3-up grid → 6 fills two full rows
  // (4 would leave two empty cells in the second row).
  const magazine: HubArticle[] = articles.map((a) => ({
    title: locale === 'de' && a.titleDe ? a.titleDe : a.title,
    slug: a.slug,
    image: a.imageUrl ?? null,
    kicker: (locale === 'de' ? a.categoryLabelDe : a.categoryLabel) ?? a.categoryLabel ?? null,
  }))
  const categoryNames: Record<string, string> = Object.fromEntries((catNameRows ?? []).map((r) => [r.slug, r.name]))
  // Unified district switcher: the weekly-rotated feature first (marked "★ Diese
  // Woche"), the rest by spot count. The rotation is deterministic per calendar
  // week — no homeWeek doc needed. Capped at 10 tabs.
  const featureSlug = pickWeeklyFeatureSlug(districtRows ?? [], today)
  const districts = assembleDistricts(featureSlug, districtRows ?? [])
  return { spotOfDay: pickSpotOfDay(candidates, today), districts, magazine, categoryNames }
}
