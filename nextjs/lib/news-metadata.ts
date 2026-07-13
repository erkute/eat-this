import type { NewsArticle } from './types'

export function getLocalizedNewsMetadata(
  article: NewsArticle,
  locale: string,
): { title: string; description: string } {
  if (locale === 'de') {
    return {
      title: article.seo?.metaTitle || article.titleDe || article.title,
      description:
        article.seo?.metaDescription || article.excerptDe || article.excerpt || '',
    }
  }

  return {
    title:
      article.seo?.metaTitleEn ||
      article.titleEn ||
      article.seo?.metaTitle ||
      article.titleDe ||
      article.title,
    description:
      article.seo?.metaDescriptionEn ||
      article.excerpt ||
      article.seo?.metaDescription ||
      article.excerptDe ||
      '',
  }
}
