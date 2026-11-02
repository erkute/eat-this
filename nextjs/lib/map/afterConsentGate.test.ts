// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { afterConsentGate } from './afterConsentGate';
const root = document.documentElement;
afterEach(() => { root.removeAttribute('data-consent-pending'); root.removeAttribute('data-consent-gate'); });
it('waits through bootstrap handover and starts once the question closes', async () => {
  root.setAttribute('data-consent-pending', '');
  const run = vi.fn();
  const cancel = afterConsentGate(run);
  expect(run).not.toHaveBeenCalled();
  root.removeAttribute('data-consent-pending');
  root.setAttribute('data-consent-gate', 'open');
  await Promise.resolve();
  expect(run).not.toHaveBeenCalled();
  root.removeAttribute('data-consent-gate');
  await Promise.resolve();
  expect(run).toHaveBeenCalledOnce();
  root.setAttribute('data-consent-gate', 'open');
  root.removeAttribute('data-consent-gate');
  await Promise.resolve();
  expect(run).toHaveBeenCalledOnce();
  cancel();
});
it('cancels a waiting mount', async () => {
  root.setAttribute('data-consent-pending', '');
  const run = vi.fn();
  afterConsentGate(run)();
  root.removeAttribute('data-consent-pending');
  await Promise.resolve();
  expect(run).not.toHaveBeenCalled();
});
it('starts immediately for a visitor with an existing answer', () => {
  const run = vi.fn();
  afterConsentGate(run)();
  expect(run).toHaveBeenCalledOnce();
});
