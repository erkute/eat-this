import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SanityClient } from '@sanity/client';
import { applyGeneratedArticle, type ArticleDraft } from './applyGeneratedArticle.server';
import type { GeneratedNewsArticle } from './generate-news-article.server';

const calls = {
  created: [] as Record<string, unknown>[],
  setIfMissing: [] as Record<string, unknown>[],
  set: [] as Record<string, unknown>[],
  takenSlugs: new Set<string>(),
  document: null as ArticleDraft | null,
};

const patch = {
  ifRevisionId: vi.fn(() => patch),
  setIfMissing: (value: Record<string, unknown>) => (calls.setIfMissing.push(value), patch),
  set: (value: Record<string, unknown>) => (calls.set.push(value), patch),
  commit: vi.fn(async () => ({})),
};

const sanity = {
  fetch: vi.fn(async (_query: string, params: { slug?: string }) => params.slug ? (calls.takenSlugs.has(params.slug) ? 1 : 0) : (calls.document ? [calls.document] : [])),
  createIfNotExists: vi.fn(async (doc: Record<string, unknown>) => {
    calls.created.push(doc);
    if (!calls.document?._id.startsWith('drafts.')) calls.document = { ...doc, _rev: 'draft-rev' } as ArticleDraft;
    return calls.document;
  }),
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
    calls.document = null;
    patch.commit.mockReset().mockResolvedValue({});
    vi.clearAllMocks();
  });

  it('fills a new article and seeds date, category and seo', async () => {
    await applyGeneratedArticle(sanity, 'a1', article, false);

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

    calls.document = current;
    await applyGeneratedArticle(sanity, 'a1', article, false);
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

    await applyGeneratedArticle(sanity, 'a1', article, true);
    expect(calls.set[1]).toMatchObject({ titleDe: 'Die besten Croissants' });
  });

  it('picks a free page address', async () => {
    calls.takenSlugs = new Set(['die-besten-croissants', 'die-besten-croissants-2']);

    await applyGeneratedArticle(sanity, 'a1', article, false);
    expect(calls.set[0]).toMatchObject({ slug: { current: 'die-besten-croissants-3' } });
  });
  it('preserves text saved during generation and retries a concurrent edit before commit', async () => {
    calls.document = { _id: 'drafts.a1', _type: 'newsArticle', _rev: 'r1', titleDe: 'Manuell gespeichert' };
    patch.commit.mockImplementationOnce(async () => {
      calls.document = { ...calls.document!, _rev: 'r2', excerptDe: 'Inzwischen ergänzt' };
      throw Object.assign(new Error('revision conflict'), { statusCode: 409 });
    });
    await applyGeneratedArticle(sanity, 'a1', article, false);
    expect(calls.set).toHaveLength(2);
    expect(calls.set[0]).not.toHaveProperty('titleDe');
    expect(calls.set[1]).not.toHaveProperty('titleDe');
    expect(calls.set[1]).not.toHaveProperty('excerptDe');
    expect(patch.ifRevisionId.mock.calls).toEqual([['r1'], ['r2']]);
  });

});
