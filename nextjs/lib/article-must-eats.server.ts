import 'server-only';
import type { NewsArticle } from './types';
import type { InitialMapData } from './map/server-initial-map-data';
import { getCachedMapData } from './map/cached-sanity';
import { composeRevealedMustEats } from './map/revealed-must-eats';
import { stripCoveredMustEats } from './map/stripCoveredMustEats';
import { addArticleMustEats } from './article-must-eats';

/** Nur die im Artikel verwendeten Karten passieren die öffentliche Grenze. */
export async function prepareArticleMustEats(article: NewsArticle, locale: string): Promise<{ article: NewsArticle; initialData: InitialMapData | null }> {
  const content = (locale === 'de' ? article.contentDe : article.content) || article.content || [];
  if (!content.length) return { article, initialData: null };
  const { mustEats } = await getCachedMapData();
  const publicIds = composeRevealedMustEats(mustEats);
  const title = (locale === 'de' ? article.titleDe : article.title) || article.title || '';
  const enriched = addArticleMustEats(content, mustEats, title);
  const ids = new Set(enriched.filter(b => b._type === 'mustEatCard').map(b => b.mustEatId).filter((id): id is string => typeof id === 'string'));
  if (!ids.size) return { article, initialData: null };
  return {
    article: { ...article, [locale === 'de' ? 'contentDe' : 'content']: enriched },
    initialData: {
      restaurants: [], categories: [], totalCount: 0,
      // Die Bildroute prüft öffentliche Freigaben selbst. Für ihr Motiv
      // braucht das statische HTML keine privaten Firestore-Inhalte.
      mustEats: stripCoveredMustEats(mustEats.filter(m => ids.has(m._id)), publicIds)
        .map(card => publicIds.has(card._id)
          ? { ...card, image: `/api/must-eat-image/${encodeURIComponent(card._id)}` }
          : card),
      revealedMustEatIds: [...publicIds].filter(id => ids.has(id)),
    },
  };
}
