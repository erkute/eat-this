import { beforeEach, it, expect, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: (n: number) => ({ inc: n }) },
}));
import { writeInsight, resetInsightCache } from './engagement.server';
const set = vi.fn();
let existing: Record<string, unknown> = {};
const ref = (path: string): unknown => ({
  path,
  get: async () => ({ data: () => existing }),
  collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
});
const db = {
  collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
  runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      get: async () => ({ data: () => existing }),
      set: (_ref: unknown, body: { pages: Record<string, unknown> }) => {
        existing = { ...existing, pages: { ...((existing.pages as object) ?? {}), ...body.pages } };
      },
    }),
  batch: () => ({
    set: (reference: { path: string }, body: unknown) => set(reference.path, body),
    commit: async () => {},
  }),
} as unknown as Firestore;
beforeEach(() => {
  set.mockClear();
  existing = {};
  resetInsightCache();
});
it('schreibt feste Signale getrennt von Besucherkennungen und reserviert auch reine Klickseiten', async () => {
  await writeInsight(db, '2026-11-02', {
    path: '/news/test',
    surface: 'article',
    device: 'phone',
    signals: [],
    click: { section: 'content', cell: '1_2', target: 'spot' },
  });
  expect(set).toHaveBeenCalledWith(
    'analytics_engagement/2026-11-02',
    expect.objectContaining({
      pages: { '/news/test': { surface: 'article', devices: { phone: {} } } },
    })
  );
  expect(set.mock.calls[1][0]).toMatch(/^analytics_heat\/.+\/days\/2026-11-02$/);
  expect(JSON.stringify(set.mock.calls)).not.toContain('analytics_seen');
});
it('begrenzt einzelne Seiten und erzeugt nach Budgetende keine weiteren Heatmap-Dokumente', async () => {
  existing = {
    pages: Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`/news/artikel-${i}`, {}])),
  };
  await writeInsight(db, '2026-11-02', {
    path: '/news/neu',
    surface: 'article',
    device: 'phone',
    signals: ['view'],
    click: { section: 'content', cell: '1_2', target: 'other' },
  });
  expect(set).toHaveBeenCalledTimes(1);
  expect(set.mock.calls[0][1].pages).toHaveProperty('_other_article');
});

it('hält das gemeinsame Limit auch nach einem Kaltstart einer weiteren Instanz ein', async () => {
  existing = {
    pages: Object.fromEntries(Array.from({ length: 199 }, (_, i) => [`/news/a-${i}`, {}])),
  };
  const beacon = {
    path: '/news/last',
    surface: 'article',
    device: 'phone',
    signals: ['view'],
  } as const;
  await writeInsight(db, '2026-11-02', { ...beacon, signals: ['view'] });
  resetInsightCache();
  await writeInsight(db, '2026-11-02', { ...beacon, path: '/news/overflow', signals: ['view'] });
  expect(set.mock.calls.at(-1)?.[1].pages).toHaveProperty('_other_article');
  expect(Object.keys(existing.pages as object)).toHaveLength(200);
});
