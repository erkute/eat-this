// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { EmailLinkState } from './EmailLinkSignIn';

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));
const download = vi.hoisted(() => {
  let finish!: () => void;
  return { started: false, ready: new Promise<void>(resolve => { finish = resolve; }), finish: () => finish() };
});
vi.mock('./EmailLinkSignInPanel', async () => {
  download.started = true;
  await download.ready;
  return { default: ({ state }: { state: EmailLinkState }) => <div role="dialog">{state.kind}</div> };
});
vi.mock('@/i18n/navigation', () => ({ usePathname: () => '/map', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/firebase/config', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ isSignInWithEmailLink: () => true }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

import EmailLinkSignIn from './EmailLinkSignIn';

afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); localStorage.clear(); });

it('keeps ordinary visits light and removes sensitive link parameters before a slow panel download finishes', async () => {
  window.history.replaceState(null, '', '/map?r=spot');
  await act(async () => { render(<EmailLinkSignIn />); });
  expect(download.started).toBe(false);
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/map?r=spot&mode=signIn&oobCode=secret-test-code&apiKey=test&e=untrusted%40example.invalid');
  await act(async () => { render(<EmailLinkSignIn />); });
  expect(window.location.search).toBe('?r=spot');
  expect(document.querySelector('[data-auth-surface-loading="email"]')).not.toBeNull();
  expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
  expect(screen.getByRole('heading', { name: 'Anmeldung bei Eat This' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('Wird geladen …');
  await act(async () => { download.finish(); await download.ready; });
  expect((await screen.findByRole('dialog')).textContent).toBe('needs-email');
  expect(document.querySelector('[data-auth-surface-loading]')).toBeNull();
});
