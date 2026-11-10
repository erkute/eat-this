import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ fetch: vi.fn(), retry: vi.fn(), config: vi.fn(() => ({ projectId: 'test', dataset: 'production' })), createClient: vi.fn() }));
vi.mock('./sanity', () => ({ client: { fetch: m.fetch, config: m.config } }));
vi.mock('@sanity/client', () => ({ createClient: m.createClient }));
import { readSanity } from './sanity-read';
beforeEach(() => {
  vi.resetAllMocks();
  m.createClient.mockReturnValue({ fetch: m.retry });
});
it.each(['Socket', 'Request'])('retries the SDK %s timeout with identical query and cache tags', async kind => {
  const options = { next: { revalidate: 60, tags: ['bezirk:mitte'] } };
  m.fetch.mockRejectedValue(new Error(`${kind} timed out on request to https://cdn.sanity.io`));
  m.retry.mockResolvedValue({ name: 'Mitte' });
  await expect(readSanity('*[]', { slug: 'mitte' }, options)).resolves.toEqual({ name: 'Mitte' });
  expect(m.retry).toHaveBeenCalledWith('*[]', { slug: 'mitte' }, options);
  expect(m.createClient).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 0 }));
});
it('propagates a persistent timeout after the single retry', async () => {
  const error = Object.assign(new Error('socket'), { code: 'ESOCKETTIMEDOUT' });
  m.fetch.mockRejectedValue(error);
  m.retry.mockRejectedValue(error);
  await expect(readSanity('*[]')).rejects.toBe(error);
  expect(m.retry).toHaveBeenCalledOnce();
});
it.each([new Error('invalid query'), Object.assign(new Error('forbidden'), { statusCode: 403 }), new TypeError('fetch failed')])('does not repeat non-timeout failures', async error => {
  m.fetch.mockRejectedValue(error);
  await expect(readSanity('*[]')).rejects.toBe(error);
  expect(m.createClient).not.toHaveBeenCalled();
});
it('does not restart a cancelled render', async () => {
  const controller = new AbortController();
  controller.abort();
  const error = Object.assign(new Error('socket'), { code: 'ESOCKETTIMEDOUT' });
  m.fetch.mockRejectedValue(error);
  await expect(readSanity('*[]', {}, { signal: controller.signal })).rejects.toBe(error);
  expect(m.createClient).not.toHaveBeenCalled();
});
