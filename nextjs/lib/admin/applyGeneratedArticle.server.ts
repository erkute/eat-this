import 'server-only';
import type { SanityClient } from '@sanity/client';
import type { GeneratedNewsArticle, NewsCategory } from './generate-news-article.server';

// Schreibt gegen den aktuellen Entwurf und dessen Revision. Parallele
// Bearbeitungen bleiben bei replace=false erhalten, auch während der Generierung.

export interface ArticleDraft {
  _id: string;
  _type: string;
  _rev?: string;
  category?: NewsCategory;
  slug?: { current?: string };
  image?: { alt?: string; asset?: { _ref?: string } };
  [field: string]: unknown;
}

const SYSTEM_FIELDS = new Set(['_id', '_rev', '_createdAt', '_updatedAt']);

/** Entwurf vor veröffentlichter Fassung; `null` für einen noch leeren Artikel. */
export async function readArticle(sanity: SanityClient, id: string): Promise<ArticleDraft | null> {
  const rows = await sanity.fetch<ArticleDraft[]>('*[_id in [$id, "drafts." + $id]]', { id });
  return rows.find((row) => row._id.startsWith('drafts.')) ?? rows[0] ?? null;
}

async function freeSlug(sanity: SanityClient, base: string, id: string): Promise<string> {
  const ids = [id, `drafts.${id}`];
  const taken = (slug: string) =>
    sanity.fetch<number>(
      'count(*[_type == "newsArticle" && slug.current == $slug && !(_id in $ids)])',
      { slug, ids }
    );
  if ((await taken(base)) === 0) return base;
  for (let n = 2; n <= 100; n++) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, 96 - suffix.length).replace(/-$/, '')}${suffix}`;
    if ((await taken(candidate)) === 0) return candidate;
  }
  throw new Error('Für diesen Titel gibt es keine freie Adresse mehr.');
}

function valueAt(doc: ArticleDraft | null, path: string): unknown {
  if (path === 'slug') return doc?.slug?.current;
  return path
    .split('.')
    .reduce<unknown>(
      (parent, key) => (parent as Record<string, unknown> | undefined)?.[key],
      doc ?? undefined
    );
}

const isEmpty = (value: unknown) =>
  value == null || value === '' || (Array.isArray(value) && value.length === 0);

export async function applyGeneratedArticle(
  sanity: SanityClient,
  id: string,
  article: GeneratedNewsArticle,
  replace: boolean
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const latest = await readArticle(sanity, id);
    if (latest && latest._type !== 'newsArticle') throw new Error('Das ist kein Artikel.');
    const seed = Object.fromEntries(
      Object.entries(latest ?? {}).filter(([key]) => !SYSTEM_FIELDS.has(key))
    );
    const draftId = `drafts.${id}`;
    const current = (await sanity.createIfNotExists({
      ...seed,
      _id: draftId,
      _type: 'newsArticle',
    })) as ArticleDraft;
    if (!current._rev) throw new Error('Der Entwurf hat keine gültige Revision.');
    const fields: Record<string, unknown> = {
      titleDe: article.titleDe,
      excerptDe: article.excerptDe,
      contentDe: article.contentDe,
      'seo.metaTitle': article.seo.metaTitle,
      'seo.metaDescription': article.seo.metaDescription,
      ...(replace || isEmpty(current.slug?.current)
        ? { slug: { _type: 'slug', current: await freeSlug(sanity, article.slug, id) } }
        : {}),
      ...(article.title ? { title: article.title } : {}),
      ...(article.excerpt ? { excerpt: article.excerpt } : {}),
      ...(article.content ? { content: article.content } : {}),
      ...(article.seo.metaTitleEn ? { 'seo.metaTitleEn': article.seo.metaTitleEn } : {}),
      ...(article.seo.metaDescriptionEn
        ? { 'seo.metaDescriptionEn': article.seo.metaDescriptionEn }
        : {}),
      ...(article.heroAlt && current.image ? { 'image.alt': article.heroAlt } : {}),
    };
    const sets = Object.fromEntries(
      Object.entries(fields).filter(([path]) => replace || isEmpty(valueAt(current, path)))
    );
    let patch = sanity
      .patch(draftId)
      .ifRevisionId(current._rev)
      .setIfMissing({
        seo: {},
        date: new Date().toISOString().slice(0, 10),
        category: article.category,
      });
    if (Object.keys(sets).length > 0) patch = patch.set(sets);
    try {
      await patch.commit({ autoGenerateArrayKeys: true });
      return;
    } catch (error) {
      if (
        attempt === 2 ||
        !error ||
        typeof error !== 'object' ||
        !('statusCode' in error) ||
        error.statusCode !== 409
      )
        throw error;
    }
  }
}
