// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { translations } from '@/lib/i18n/translations';
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
vi.mock('./AuthScreen', () => ({ default: () => <div data-testid="auth-screen" /> }));

import LoginPanel from './LoginPanel';

const onBack = vi.fn();

function panel() {
  return render(
    <NextIntlClientProvider locale="de" messages={translations.de} timeZone="Europe/Berlin">
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

describe('LoginPanel — die Szene zeigt, wonach der Gast gegriffen hat', () => {
  it('zeigt ohne Anlass das Starter Pack', () => {
    const { container } = panel();
    expect(title(container)).toBe('Starter Pack');
    expect(container.querySelector('h2')?.previousElementSibling?.textContent).toBe(
      'Starte deine Sammlung'
    );
    expect(container.textContent).toContain(
      '20 Must Eats aus ganz Berlin. Entdecke unsere Empfehlungen und sammle sie in deinem Deck.'
    );
  });

  /* Kein Spot-Name: im Startseiten-Teaser ist er Teil der Überraschung. */
  it('verspricht bei einer angetippten Karte genau diese', () => {
    modal.reason = { kind: 'card', mustEatId: 'me-9' };
    const { container } = panel();
    expect(title(container)).toBe('Schau drunter');
    expect(container.querySelector('h2')?.previousElementSibling?.textContent).toBe(
      'Decke deine Must Eats auf'
    );
    expect(container.textContent).toContain(
      'Hinter jeder Karte steckt eine Empfehlung. Dein Starter Pack bringt dir 20 Must Eats aus ganz Berlin.'
    );
    expect(container.innerHTML).toContain('card-back.webp');
  });

  /* Vorher bekam ein Gast mit Herz „Einloggen" und „Dein Deck wartet" — ohne
     je ein Deck gehabt zu haben. */
  it('zeigt beim Herz den Spot vor dem Pack statt eines Decks', () => {
    modal.reason = {
      kind: 'heart',
      restaurantId: 'sofi',
      name: 'Sofi',
      photo: 'https://cdn.sanity.io/images/p/d/a.jpg',
    };
    const { container } = panel();
    expect(title(container)).toBe('Für später');
    // Der Kicker sagt, wozu das Herz da ist — nicht den Bezirk (Betreiber, 24.09.2026).
    expect(container.querySelector('h2')?.previousElementSibling?.textContent).toBe(
      'Speichere deine Spots'
    );
    expect(container.textContent).toContain(
      'Deine gespeicherten Spots an einem Ort. Dazu dein Starter Pack mit 20 Must Eats aus ganz Berlin.'
    );
    expect(container.textContent).not.toMatch(/Deck|Profil/);
    expect(container.innerHTML).toContain('booster_free.webp');
  });
});

describe('LoginPanel — Rahmen', () => {
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

  /* Ein Login, der während des offenen Modals durchgeht, hält den
     Wartescreen, bis BridgeAuth das Modal schliesst. */
  it('hält den Wartescreen, sobald jemand angemeldet ist', () => {
    modal.user = { uid: 'u1' };
    const { getByTestId } = panel();
    expect(getByTestId('auth-screen')).toBeTruthy();
  });
});
