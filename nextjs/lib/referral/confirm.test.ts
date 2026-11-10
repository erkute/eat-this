import { afterEach, expect, it, vi } from 'vitest';
import { confirmReferral } from './confirm';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('retries an incomplete response and a network failure until confirmation', async () => {
  vi.useFakeTimers();
  const request = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ completed: false }), { status: 503 }))
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(new Response(JSON.stringify({ completed: true })));
  vi.stubGlobal('fetch', request);
  const token = vi.fn().mockResolvedValue('fresh-token');
  const confirmation = confirmReferral(token, new AbortController().signal);
  await vi.runAllTimersAsync();
  expect(await confirmation).toBe(true);
  expect(request).toHaveBeenCalledTimes(3);
  expect(token).toHaveBeenCalledTimes(3);
});

it('does not treat an HTTP success without a completed result as confirmation', async () => {
  vi.useFakeTimers();
  const request = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}')));
  vi.stubGlobal('fetch', request);
  const confirmation = confirmReferral(async () => 'token', new AbortController().signal);
  await vi.runAllTimersAsync();
  expect(await confirmation).toBe(false);
  expect(request).toHaveBeenCalledTimes(8);
});

it('cancels a pending retry when the account changes or the listener unmounts', async () => {
  vi.useFakeTimers();
  const request = vi.fn().mockRejectedValue(new Error('offline'));
  vi.stubGlobal('fetch', request);
  const controller = new AbortController();
  const confirmation = confirmReferral(async () => 'token', controller.signal);
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  await vi.runAllTimersAsync();
  expect(await confirmation).toBe(false);
  expect(request).toHaveBeenCalledTimes(1);
});
