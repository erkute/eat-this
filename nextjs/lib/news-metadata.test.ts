import { describe, expect, it } from 'vitest'
import { getLocalizedNewsMetadata } from './news-metadata'
import type { NewsArticle } from './types'

const article: NewsArticle = {
  _id: 'article-1',
  slug: 'berlin-news',
  title: 'English title',
  titleEn: 'English title',
  titleDe: 'Deutscher Titel',
  date: '2026-07-13',
  excerpt: 'English excerpt',
  excerptDe: 'Deutscher Teaser',
  seo: {
    metaTitle: 'Deutscher SEO-Titel',
    metaTitleEn: 'English SEO title',
    metaDescription: 'Deutsche SEO-Beschreibung',
    metaDescriptionEn: 'English SEO description',
  },
}

describe('getLocalizedNewsMetadata', () => {
  it('uses the English SEO fields for English metadata', () => {
    expect(getLocalizedNewsMetadata(article, 'en')).toEqual({
      title: 'English SEO title',
      description: 'English SEO description',
    })
  })

  it('keeps the German SEO fields on German pages', () => {
    expect(getLocalizedNewsMetadata(article, 'de')).toEqual({
      title: 'Deutscher SEO-Titel',
      description: 'Deutsche SEO-Beschreibung',
    })
  })

  it('falls back to localized copy before the other language', () => {
    const withoutSeo = { ...article, seo: undefined }
    expect(getLocalizedNewsMetadata(withoutSeo, 'en')).toEqual({
      title: 'English title',
      description: 'English excerpt',
    })
    expect(getLocalizedNewsMetadata(withoutSeo, 'de')).toEqual({
      title: 'Deutscher Titel',
      description: 'Deutscher Teaser',
    })
  })

  it('caps long editorial descriptions at 155 characters', () => {
    const longArticle = {
      ...article,
      seo: {
        ...article.seo,
        metaDescription: 'Sehr lange Beschreibung ohne Satzende '.repeat(10),
      },
    }
    expect(getLocalizedNewsMetadata(longArticle, 'de').description.length).toBeLessThanOrEqual(155)
  })
})
