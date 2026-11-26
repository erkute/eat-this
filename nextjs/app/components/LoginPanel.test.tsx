// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { getCatalogMessages } from '@/lib/i18n/translations';
import type { LoginReason } from '@/lib/auth/LoginModalContext';

const modal = vi.hoisted(() => ({
  reason: null as LoginReason | null,
  user: null as { uid: string } | null,
  prepare: vi.fn(),
  track: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: modal.user, loading: false }),
  useLoginModal: () => ({ isOpen: true, reason: modal.reason, intent: null }),
  useMagicLink: () => ({ sendLink: vi.fn(), state: 'idle', errorMessage: '', reset: vi.fn() }),
  useGoogleSignIn: () => ({
    phase: 'idle',
    note: null,
    noteKey: null,
    prepare: modal.prepare,
    start: vi.fn(),
  }),
}));
vi.mock('@/lib/analytics', () => ({ trackEvent: modal.track }));

import LoginPanel from './LoginPanel';

const onBack = vi.fn();

function panel(locale: 'de' | 'en' = 'de') {
  return render(
    <NextIntlClientProvider locale={locale} messages={getCatalogMessages(locale, 100)} timeZone="Europe/Berlin">
      <LoginPanel onBack={onBack} />
    </NextIntlClientProvider>
  );
}

const title = (container: HTMLElement) => container.querySelector('h2')?.textContent;

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  modal.reason = null;
  modal.user = null;
});

describe('LoginPanel — Starter Pack mit Texten zum Anlass', () => {
  it('zeigt ohne Anlass das Starter Pack', () => {
    const { container } = panel();
    expect(title(container)).toBe('Dein Starter Pack.');
    expect(container.textContent).toContain('Melde dich an und hol dir 20\u00a0Must Eats.');
    expect(container.textContent).toContain('Neu hier? Deine Anmeldung legt dein Konto an.');
  });

  /* Kein Spot-Name: im Startseiten-Teaser ist er Teil der Überraschung. */
  it.each([
    ['de', 'Deck diese Karte auf.', 'Dein Starter Pack deckt sie auf, dazu 19'],
    ['en', 'Reveal this card.', 'Your Starter Pack reveals it, plus 19'],
  ] as const)('nennt die Bedingungen der Wunschkarte auf %s', (locale, heading, condition) => {
    modal.reason = { kind: 'card', mustEatId: 'me-9' };
    const { container } = panel(locale);
    expect(title(container)).toBe(heading);
    expect(container.textContent).toContain(condition);
    expect(container.innerHTML).not.toContain('card-back.webp');
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.innerHTML).toContain('starter-pack-front.webp');
  });

  it('erklärt beim Herz das Speichern in den Favoriten', () => {
    modal.reason = {
      kind: 'heart',
      restaurantId: 'sofi',
      name: 'Sofi',
      photo: 'https://cdn.sanity.io/images/p/d/a.jpg',
    };
    const { container } = panel();
    expect(title(container)).toBe('Für später merken.');
    expect(container.textContent).toContain('Melde dich an und speicher diesen Spot.');
    expect(container.textContent).toContain('Neu hier? Deine Anmeldung legt dein Konto an.');
    expect(container.innerHTML).toContain('starter-pack-front.webp');
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.innerHTML).not.toContain('cdn.sanity.io/images/p/d/a.jpg');
    expect(container.querySelector('img')?.parentElement?.querySelector('svg')).toBeNull();
  });
});

describe('LoginPanel — Rahmen', () => {
  it('schliesst das Fenster mit Escape', () => {
    const { getByRole } = panel();
    fireEvent.keyDown(getByRole('dialog'), { key: 'Escape' });
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('schliesst über den Kreuz-Knopf', () => {
    const { container } = panel();
    fireEvent.click(container.querySelector('button[aria-label="Zurück"]')!);
    expect(onBack).toHaveBeenCalled();
  });

  // Ohne Vorlauf frisst der Popup-Blocker den ersten Google-Klick.
  it('lädt den Popup-Helfer vor, sobald das Modal steht', () => {
    panel();
    expect(modal.prepare).toHaveBeenCalled();
  });

  it('zählt, aus welchem Anlass das Formular aufging', () => {
    modal.reason = { kind: 'card', mustEatId: 'me-9' };
    panel();
    expect(modal.track).toHaveBeenCalledWith('login_view', { surface: 'modal', context: 'card' });
  });


});

it('offers the automatic pack invitation with a working close button', () => {
  modal.reason = { kind: 'map-prompt' };
  const { container, getByRole } = panel();
  expect(modal.prepare).not.toHaveBeenCalled();
  expect(title(container)).toBe('Dein Starter Pack.');
  expect(container.textContent).toContain('Melde dich an und hol dir 20\u00a0Must Eats.');
  fireEvent.click(getByRole('button', { name: 'Zurück' }));
  expect(onBack).toHaveBeenCalledOnce();
});
