import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SanityClient } from '@sanity/client';
import { applyGeneratedArticle, type ArticleDraft } from './applyGeneratedArticle.server';
import type { GeneratedNewsArticle } from './generate-news-article.server';

const calls = {
  created: [] as Record<string, unknown>[],
  setIfMissing: [] as Record<string, unknown>[],
  set: [] as Record<string, unknown>[],
  takenSlugs: new Set<string>(),
};

const patch = {
  setIfMissing: (value: Record<string, unknown>) => (calls.setIfMissing.push(value), patch),
  set: (value: Record<string, unknown>) => (calls.set.push(value), patch),
  commit: vi.fn(async () => ({})),
};

const sanity = {
  fetch: vi.fn(async (_query: string, params: { slug: string }) => (calls.takenSlugs.has(params.slug) ? 1 : 0)),
  createIfNotExists: vi.fn(async (doc: Record<string, unknown>) => calls.created.push(doc)),
  patch: vi.fn(() => patch),
} as unknown as SanityClient;

const article = {
  category: 'guides',
  titleDe: 'Die besten Croissants',
  excerptDe: 'Teaser',
  contentDe: [{ _type: 'block' }],
  title: 'The best croissants',
  excerpt: 'Teaser EN',
  content: [{ _type: 'block' }],
  heroAlt: 'Croissant auf Teller',
  slug: 'die-besten-croissants',
  seo: { metaTitle: 'T', metaDescription: 'D', metaTitleEn: 'TE', metaDescriptionEn: null },
  sources: [],
} as unknown as GeneratedNewsArticle;

describe('applyGeneratedArticle', () => {
  beforeEach(() => {
    calls.created = [];
    calls.setIfMissing = [];
    calls.set = [];
    calls.takenSlugs = new Set();
    vi.clearAllMocks();
  });

  it('fills a new article and seeds date, category and seo', async () => {
    await applyGeneratedArticle(sanity, 'a1', null, article, false);

    expect(calls.created[0]).toEqual({ _id: 'drafts.a1', _type: 'newsArticle' });
    expect(calls.setIfMissing[0]).toMatchObject({ seo: {}, category: 'guides' });
    expect(calls.set[0]).toMatchObject({
      titleDe: 'Die besten Croissants',
      title: 'The best croissants',
      'seo.metaTitleEn': 'TE',
      slug: { _type: 'slug', current: 'die-besten-croissants' },
    });
    expect(calls.set[0]).not.toHaveProperty('seo.metaDescriptionEn');
    expect(calls.set[0]).not.toHaveProperty('image.alt');
  });

  it('leaves written fields alone unless asked to replace them', async () => {
    const current: ArticleDraft = {
      _id: 'a1',
      _type: 'newsArticle',
      _rev: 'r1',
      titleDe: 'Mein Titel',
      slug: { current: 'mein-titel' },
      image: { asset: { _ref: 'image-x' } },
    };

    await applyGeneratedArticle(sanity, 'a1', current, article, false);
    expect(calls.created[0]).toEqual({
      _id: 'drafts.a1',
      _type: 'newsArticle',
      titleDe: 'Mein Titel',
      slug: { current: 'mein-titel' },
      image: { asset: { _ref: 'image-x' } },
    });
    expect(calls.set[0]).not.toHaveProperty('titleDe');
    expect(calls.set[0]).not.toHaveProperty('slug');
    expect(calls.set[0]).toMatchObject({ 'image.alt': 'Croissant auf Teller', excerptDe: 'Teaser' });

    await applyGeneratedArticle(sanity, 'a1', current, article, true);
    expect(calls.set[1]).toMatchObject({ titleDe: 'Die besten Croissants' });
  });

  it('picks a free page address', async () => {
    calls.takenSlugs = new Set(['die-besten-croissants', 'die-besten-croissants-2']);

    await applyGeneratedArticle(sanity, 'a1', null, article, false);
    expect(calls.set[0]).toMatchObject({ slug: { current: 'die-besten-croissants-3' } });
  });
});
