// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-27T12:00:00Z'));
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('keeps the pause across remounts and expires after seven days', async () => {
  const first = await import('../starterPromptCooldown');
  expect(first.starterPromptPaused()).toBe(false);
  first.pauseStarterPrompt();
  vi.resetModules();
  const next = await import('../starterPromptCooldown');
  vi.advanceTimersByTime(7 * 86400000 - 1);
  expect(next.starterPromptPaused()).toBe(true);
  vi.advanceTimersByTime(1);
  expect(next.starterPromptPaused()).toBe(false);
});

it('respects the pause in memory when browser storage is blocked', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const { pauseStarterPrompt, starterPromptPaused } = await import('../starterPromptCooldown');
  expect(starterPromptPaused()).toBe(false);
  expect(() => pauseStarterPrompt()).not.toThrow();
  expect(starterPromptPaused()).toBe(true);
});
