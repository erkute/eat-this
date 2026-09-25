import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';

const store = new Map<string, unknown>();
const collection = vi.fn(() => ({
  doc: (id: string) => ({
    set: async (data: unknown) => void store.set(id, data),
    get: async () => ({ exists: store.has(id), data: () => store.get(id) }),
  }),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminFirestore: () => ({ collection }) }));

import { NEWS_PREVIEW_TTL_MS, loadNewsPreview, saveNewsPreview } from './newsPreview.server';
import type { NewsArticle } from '@/lib/types';

const article = { _id: 'drafts.x', slug: 'x', title: 'X', excerpt: undefined } as NewsArticle;

describe('news preview snapshots', () => {
  beforeEach(() => {
    store.clear();
    vi.useRealTimers();
  });

  it('round-trips an article under an unguessable id', async () => {
    const id = await saveNewsPreview(article);
    expect(id).toMatch(/^[a-f0-9]{32}$/);
    await expect(loadNewsPreview(id)).resolves.toEqual({ _id: 'drafts.x', slug: 'x', title: 'X' });
  });

  it('refuses malformed ids without touching Firestore', async () => {
    collection.mockClear();
    await expect(loadNewsPreview('../users/abc')).resolves.toBeNull();
    expect(collection).not.toHaveBeenCalled();
  });

  it('treats an expired snapshot as missing even before TTL deletes it', async () => {
    const id = await saveNewsPreview(article);
    const doc = store.get(id) as { expiresAt: Timestamp };
    expect(doc.expiresAt.toMillis()).toBeGreaterThan(Date.now() + NEWS_PREVIEW_TTL_MS - 5000);
    store.set(id, { ...doc, expiresAt: Timestamp.fromMillis(Date.now() - 1) });
    await expect(loadNewsPreview(id)).resolves.toBeNull();
  });
});
