import 'server-only';
import type { NewsArticle } from './types';
import { getMustEatsCatalogData, type InitialMapData } from './map/server-initial-map-data';
import { addArticleMustEats } from './article-must-eats';

/** Nur die im Artikel verwendeten Karten passieren die öffentliche Grenze. */
export async function prepareArticleMustEats(article: NewsArticle, locale: string): Promise<{ article: NewsArticle; initialData: InitialMapData | null }> {
  const content = (locale === 'de' ? article.contentDe : article.content) || article.content || [];
  if (!content.length) return { article, initialData: null };
  const catalog = await getMustEatsCatalogData();
  const title = (locale === 'de' ? article.titleDe : article.title) || article.title || '';
  const enriched = addArticleMustEats(content, catalog.mustEats, title);
  const ids = new Set(enriched.filter(b => b._type === 'mustEatCard').map(b => b.mustEatId).filter((id): id is string => typeof id === 'string'));
  if (!ids.size) return { article, initialData: null };
  return {
    article: { ...article, [locale === 'de' ? 'contentDe' : 'content']: enriched },
    initialData: {
      restaurants: [], categories: [], totalCount: 0,
      mustEats: catalog.mustEats.filter(m => ids.has(m._id)),
      revealedMustEatIds: catalog.revealedMustEatIds.filter(id => ids.has(id)),
    },
  };
}
