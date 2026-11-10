import type { NewsArticle, PortableTextBlock } from './types';

/** Prefer a non-empty translation, otherwise render the available article. */
export function articleContent(article: Pick<NewsArticle, 'content' | 'contentDe'>, locale: string): PortableTextBlock[] {
  const preferred = locale === 'de' ? article.contentDe : article.content;
  const fallback = locale === 'de' ? article.content : article.contentDe;
  return preferred?.length ? preferred : fallback ?? [];
}
