import { client } from '@/lib/sanity';
import { SANITY_REVALIDATE_SECONDS } from '@/lib/constants';
import { getLatestNewsArticles } from '@/lib/sanity.server';
import { pickSpotOfDay, type SpotCandidate } from './pickSpotOfDay';

interface HomeSpot extends SpotCandidate {
  name: string;
  slug: string;
  image: string | null;
  district: string | null;
  sub: string | null;
}

export interface HubArticle {
  title: string;
  slug: string;
  image: string | null;
  kicker: string | null;
  /** ISO-Datum der Veröffentlichung — die Kachel nennt es wie der Magazin-Index. */
  date?: string | null;
}

export interface HomeData {
  spotOfDay: HomeSpot | null;
  magazine: HubArticle[];
  categoryNames: Record<string, string>;
}

const spotCandidatesQuery = `*[_type == "restaurant" && isOpen == true && !(_id in path("drafts.**"))]{
  _id,
  "name": name,
  "slug": slug.current,
  featuredOnDate,
  "image": image.asset->url,
  "district": coalesce(bezirkRef->name, district, null),
  "sub": select($locale == "en" => coalesce(shortDescriptionEn, shortDescription), shortDescription)
}`;

const categoryNamesQuery = `*[_type == "category" && defined(slug.current)]{
  "slug": slug.current,
  "name": select($locale == "en" => nameEn, name)
}`;

/** Server: assemble the Hub's initial data. `today` defaults to the server's date. */
export async function getHomeData(
  locale: 'de' | 'en',
  today: string = new Date().toISOString().slice(0, 10)
): Promise<HomeData> {
  const [candidates, articles, catNameRows] = await Promise.all([
    client.fetch<HomeSpot[]>(
      spotCandidatesQuery,
      { locale },
      { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['restaurant', 'mustEat'] } }
    ),
    getLatestNewsArticles(6),
    client.fetch<{ slug: string; name: string }[]>(
      categoryNamesQuery,
      { locale },
      { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['category'] } }
    ),
  ]);
  // a.title is already the EN base (or DE fallback) via the news GROQ coalesce;
  // a.titleDe is the German override. So de → titleDe||title, en → title.
  // Desktop renders the magazine as a 3-up grid → 6 fills two full rows
  // (4 would leave two empty cells in the second row).
  const magazine: HubArticle[] = articles.map((a) => ({
    title: locale === 'de' && a.titleDe ? a.titleDe : a.title,
    slug: a.slug,
    image: a.imageUrl ?? null,
    kicker: (locale === 'de' ? a.categoryLabelDe : a.categoryLabel) ?? a.categoryLabel ?? null,
    date: a.date ?? null,
  }));
  const categoryNames: Record<string, string> = Object.fromEntries(
    (catNameRows ?? []).map((r) => [r.slug, r.name])
  );
  return { spotOfDay: pickSpotOfDay(candidates, today), magazine, categoryNames };
}
