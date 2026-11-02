// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useRestaurantDetail } from './useRestaurantDetail';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('never returns previous contact details during a slug change, even before effects', async () => {
  let finishSecond!: (response: Response) => void;
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ phone: '111', address: 'First Street' }) })
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishSecond = resolve; })));
  const renders: Array<{ slug: string; phone: string | undefined; loading: boolean }> = [];
  const { rerender, result } = renderHook(({ slug }) => {
    const detail = useRestaurantDetail(slug);
    renders.push({ slug, phone: detail.detail?.phone, loading: detail.loading });
    return detail;
  }, { initialProps: { slug: 'first-contact-test' } });
  await act(async () => {});
  expect(result.current.detail?.phone).toBe('111');
  rerender({ slug: 'second-contact-test' });
  expect(renders.filter((r) => r.slug === 'second-contact-test')).toEqual(
    expect.arrayContaining([{ slug: 'second-contact-test', phone: undefined, loading: true }])
  );
  expect(renders.some((r) => r.slug === 'second-contact-test' && r.phone === '111')).toBe(false);
  await act(async () => { finishSecond({ ok: true, json: async () => ({ phone: '222' }) } as Response); });
  expect(result.current.detail?.phone).toBe('222');
  rerender({ slug: 'first-contact-test' });
  expect(result.current.detail?.phone).toBe('111');
  expect(renders.filter((r) => r.slug === 'first-contact-test').some((r) => r.phone === '222')).toBe(false);
});
