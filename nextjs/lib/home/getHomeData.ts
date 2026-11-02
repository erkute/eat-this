import { getLatestNewsArticles } from '@/lib/sanity.server';
import type { CoverData } from '@/lib/magazineCover';
export interface HubArticle {
  title: string;
  slug: string;
  image: string | null;
  /** ISO-Datum der Veröffentlichung — das Heft nennt seinen Monat. */
  date?: string | null;
  /** Ausgabe: Platz in der Reihe aller Artikel, der älteste ist 1. */
  issue: number;
  /** Look und Freisteller des Hefts. */
  cover: CoverData | null;
}

export interface HomeData {
  magazine: HubArticle[];
}

/**
 * Die neuesten `limit` Hefte, die neueste zuerst. Auch der Schluss der
 * Übersichten /bezirk und /kategorie liest sie hier — dieselbe Zählung der
 * Ausgaben wie auf der Startseite.
 */
export async function latestIssues(limit: number, locale: 'de' | 'en'): Promise<HubArticle[]> {
  const latest = await getLatestNewsArticles(limit);
  // a.title is already the EN base (or DE fallback) via the news GROQ coalesce;
  // a.titleDe is the German override. So de → titleDe||title, en → title.
  // Newest first, so the first is the highest issue and they count down.
  return latest.articles.map((a, i) => ({
    title: locale === 'de' && a.titleDe ? a.titleDe : a.title,
    slug: a.slug,
    image: a.imageUrl ?? null,
    date: a.date ?? null,
    issue: latest.total - i,
    cover: a.cover ?? null,
  }));
}

/** Server: assemble the Hub's initial data. */
export async function getHomeData(locale: 'de' | 'en'): Promise<HomeData> {
  // Vier aktuelle Hefte im Fächer, vier weitere in der kompakten Reihe.
  const magazine = await latestIssues(8, locale);
  return {
    magazine,
  };
}
