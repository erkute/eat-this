import { describe, expect, it, vi } from 'vitest';

import { coalesceRateLimit } from './rateLimitCoalesce';
import type { RateLimitDecision } from './rateLimitWindow';

const state = { minuteStart: 0, minuteCount: 0, dayStart: 0, dayCount: 0 };
const allow: RateLimitDecision = { allowed: true, state };
const deny: RateLimitDecision = { allowed: false, reason: 'per_minute', state };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('coalesceRateLimit', () => {
  it('runs the first request alone and folds everything that arrives meanwhile into one batch', async () => {
    const first = deferred<RateLimitDecision>();
    const batch = deferred<RateLimitDecision>();
    const check = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(batch.promise);
    const limit = coalesceRateLimit(check);

    const a = limit('k');
    const b = limit('k');
    const c = limit('k');
    const d = limit('k');
    expect(check).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledWith('k', 1);

    first.resolve(allow);
    expect(await a).toBe(allow);
    await vi.waitFor(() => expect(check).toHaveBeenCalledTimes(2));
    expect(check).toHaveBeenLastCalledWith('k', 3);

    batch.resolve(deny);
    expect(await Promise.all([b, c, d])).toEqual([deny, deny, deny]);
  });

  it('keeps keys apart and starts fresh once a key is idle again', async () => {
    const check = vi.fn(async () => allow);
    const limit = coalesceRateLimit(check);

    await Promise.all([limit('a'), limit('b')]);
    expect(check.mock.calls).toEqual([
      ['a', 1],
      ['b', 1],
    ]);

    await limit('a');
    expect(check).toHaveBeenCalledTimes(3);
    expect(check).toHaveBeenLastCalledWith('a', 1);
  });

  it('hands a failing batch check to every waiter and recovers afterwards', async () => {
    const first = deferred<RateLimitDecision>();
    const check = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(allow);
    const limit = coalesceRateLimit(check);

    const a = limit('k');
    const b = limit('k');
    first.resolve(allow);
    await a;
    await expect(b).rejects.toThrow('boom');

    expect(await limit('k')).toBe(allow);
  });
});
