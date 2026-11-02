// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
const download = vi.hoisted(() => {
  let finish!: () => void;
  return { started: false, ready: new Promise<void>(resolve => { finish = resolve; }), finish: () => finish() };
});
vi.mock('./SignInRewardPanel', async () => {
  download.started = true;
  await download.ready;
  const { useState } = await import('react');
  return { default: function MockRewardPanel({ cards }: { cards: string[] }) {
    const [initialCards] = useState(cards);
    return <div role="dialog">{initialCards.join(',')}</div>;
  } };
});
import SignInReward from './SignInReward';
import { announceStarterPackGranted } from '@/lib/auth/signInArrival';

afterEach(cleanup);

it('retains an early grant during a slow download, covers the page and starts a fresh tour for a later grant', async () => {
  await act(async () => { render(<SignInReward />); });
  expect(download.started).toBe(false);
  cleanup();
  announceStarterPackGranted(['first-card', 'second-card']);
  await act(async () => { render(<SignInReward />); });
  expect(document.querySelector('[data-auth-surface-loading="tour"]')).not.toBeNull();
  expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
  await act(async () => { download.finish(); await download.ready; });
  expect((await screen.findByRole('dialog')).textContent).toBe('first-card,second-card');
  expect(document.querySelector('[data-auth-surface-loading]')).toBeNull();
  await act(async () => announceStarterPackGranted(['new-card']));
  expect(screen.getByRole('dialog').textContent).toBe('new-card');
});
