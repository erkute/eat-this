import { describe, it, expect, vi, afterEach } from 'vitest';
import { newUsage, recordUsage, usdSpent, reportUsage, SONNET_5, SONNET_4_6 } from './run-usage';

afterEach(() => vi.restoreAllMocks());

describe('recordUsage', () => {
  it('accumulates across calls and tolerates missing fields', () => {
    const u = newUsage();
    recordUsage(u, { input_tokens: 100, output_tokens: 20 });
    recordUsage(u, {
      input_tokens: 50,
      cache_read_input_tokens: 900,
      cache_creation_input_tokens: 200,
      server_tool_use: { web_search_requests: 3 },
    });
    expect(u).toEqual({ in: 150, cachedIn: 900, cacheWrite: 200, out: 20, searches: 3 });
  });

  it('treats null cache fields as zero', () => {
    const u = newUsage();
    recordUsage(u, { input_tokens: 10, cache_read_input_tokens: null, server_tool_use: null });
    expect(u.cachedIn).toBe(0);
    expect(u.searches).toBe(0);
  });
});

describe('usdSpent', () => {
  it('prices plain input and output at list rates', () => {
    // 1M input + 1M output on Sonnet 5 = $2 + $10.
    expect(
      usdSpent({ in: 1e6, cachedIn: 0, cacheWrite: 0, out: 1e6, searches: 0 }, SONNET_5)
    ).toBeCloseTo(12, 5);
  });

  it('bills cache reads at a tenth and cache writes at 1.25x', () => {
    expect(
      usdSpent({ in: 0, cachedIn: 1e6, cacheWrite: 0, out: 0, searches: 0 }, SONNET_5)
    ).toBeCloseTo(0.2, 5);
    expect(
      usdSpent({ in: 0, cachedIn: 0, cacheWrite: 1e6, out: 0, searches: 0 }, SONNET_5)
    ).toBeCloseTo(2.5, 5);
  });

  it('adds web search at $10 per 1,000', () => {
    expect(
      usdSpent({ in: 0, cachedIn: 0, cacheWrite: 0, out: 0, searches: 250 }, SONNET_5)
    ).toBeCloseTo(2.5, 5);
  });

  it('reproduces the measured run: $5.99 over 64 documents', () => {
    // 142 searches · 5265k input of which 4120k cached · 88k output.
    const u = {
      in: 5265_000 - 4120_000 - 140_000,
      cachedIn: 4120_000,
      cacheWrite: 140_000,
      out: 88_000,
      searches: 142,
    };
    const total = usdSpent(u, SONNET_5);
    expect(total).toBeGreaterThan(5.4);
    expect(total).toBeLessThan(6.6);
  });

  it('is more expensive on Sonnet 4.6 than on Sonnet 5', () => {
    const u = { in: 1e6, cachedIn: 0, cacheWrite: 0, out: 1e5, searches: 0 };
    expect(usdSpent(u, SONNET_4_6)).toBeGreaterThan(usdSpent(u, SONNET_5));
  });
});

describe('reportUsage', () => {
  it('omits the search clause when nothing was searched', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    reportUsage('t', { in: 1000, cachedIn: 0, cacheWrite: 0, out: 100, searches: 0 }, SONNET_5, 2);
    expect(log.mock.calls[0][0]).not.toContain('Suchen');
    expect(log.mock.calls[1][0]).toContain('pro Dokument');
  });

  it('omits the per-document figure when nothing completed', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    reportUsage('t', newUsage(), SONNET_5, 0);
    expect(log.mock.calls[1][0]).not.toContain('pro Dokument');
  });
});
