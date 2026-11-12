import { articleContent } from '@/lib/article-content';
import 'server-only';
import type { NewsArticle } from './types';
import type { InitialMapData } from './map/server-initial-map-data';
import { getCachedMustEatsForPage } from './map/cached-sanity';
import { selectPublicMustEatData } from './must-eat/public-card-data.server';
import { addArticleMustEats } from './article-must-eats';

/** Nur die im Artikel verwendeten Karten passieren die öffentliche Grenze. */
export async function prepareArticleMustEats(article: NewsArticle, locale: string): Promise<{ article: NewsArticle; initialData: InitialMapData | null }> {
  const content = articleContent(article, locale);
  if (!content.length) return { article, initialData: null };
  const mustEats = await getCachedMustEatsForPage();
  const title = (locale === 'de' ? article.titleDe : article.title) || article.title || '';
  const hidden = new Set(article.hiddenMustEats);
  const enriched = addArticleMustEats(content, mustEats.filter(m => !hidden.has(m._id)), title);
  const ids = new Set(enriched.filter(b => b._type === 'mustEatCard').map(b => b.mustEatId).filter((id): id is string => typeof id === 'string'));
  if (!ids.size) return { article, initialData: null };
  return {
    article: { ...article, [locale === 'de' ? 'contentDe' : 'content']: enriched },
    initialData: selectPublicMustEatData(mustEats, ids),
  };
}
