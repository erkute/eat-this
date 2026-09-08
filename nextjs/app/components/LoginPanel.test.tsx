// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { LoginIntent } from '@/lib/auth/loginContinueUrl';

const auth = vi.hoisted(() => ({
  sendLink: vi.fn(),
  magicReset: vi.fn(),
  magicState: 'idle' as 'idle' | 'sending' | 'sent' | 'error',
  magicError: '',
  intent: null as LoginIntent | null,
  handleGoogle: vi.fn(),
  prepareGoogle: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null, loading: false }),
  useMagicLink: () => ({
    sendLink: auth.sendLink,
    state: auth.magicState,
    errorMessage: auth.magicError,
    reset: auth.magicReset,
  }),
  useLoginModal: () => ({
    isOpen: true,
    mode: 'starter',
    intent: auth.intent,
    open: vi.fn(),
    close: vi.fn(),
  }),
  useGoogleSignIn: () => ({
    phase: 'idle',
    note: null,
    noteKey: null,
    prepare: auth.prepareGoogle,
    start: auth.handleGoogle,
  }),
}));

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('next-intl', () => ({ useLocale: () => 'de' }));

/* Echte Texte statt einer Attrappen-Tabelle: die Beschriftungen der Knöpfe
   sind hier genau das, was geprüft werden soll. */
vi.mock('@/lib/i18n', async () => {
  const { translations } = await import('@/lib/i18n/translations');
  return {
    useTranslation: () => ({
      lang: 'de',
      setLang: vi.fn(),
      t: (key: string) =>
        (key.split('.').reduce<unknown>((node, part) => {
          if (node && typeof node === 'object') return (node as Record<string, unknown>)[part];
          return undefined;
        }, translations.de) as string | undefined) ?? key,
    }),
  };
});

import LoginPanel from './LoginPanel';

const onBack = vi.fn();

function panel(mode: 'starter' | 'signin' = 'starter') {
  return render(<LoginPanel onBack={onBack} mode={mode} />);
}

function button(container: HTMLElement, text: string) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  auth.magicState = 'idle';
  auth.magicError = '';
  auth.intent = null;
  window.history.replaceState(null, '', '/map?r=sofi');
});

describe('LoginPanel — Starter- und Einloggen-Modus', () => {
  it('zeigt im Starter-Modus das Pack und den Anmelden-Knopf', () => {
    const { container } = panel('starter');
    expect(container.textContent).toContain('Starter Pack');
    expect(container.textContent).toContain('20 Must Eats');
    expect(button(container, 'Anmelden')).toBeTruthy();
    expect(container.textContent).toContain('Mit Google anmelden');
  });

  it('zeigt im Einloggen-Modus das wartende Deck statt des Packs', () => {
    const { container } = panel('signin');
    expect(container.textContent).toContain('Dein Deck wartet.');
    expect(container.textContent).not.toContain('Starter Pack');
    expect(button(container, 'Einloggen')).toBeTruthy();
    expect(container.textContent).toContain('Mit Google einloggen');
  });

  it('lädt den Popup-Helfer vor, sobald die Oberfläche steht', () => {
    // Ohne diesen Vorlauf frisst der Popup-Blocker den ersten Google-Klick.
    panel();
    expect(auth.prepareGoogle).toHaveBeenCalled();
  });

  it('schliesst über den Kreuz-Knopf', () => {
    const { container } = panel();
    fireEvent.click(container.querySelector('button[aria-label="Zurück"]')!);
    expect(onBack).toHaveBeenCalled();
  });
});

describe('LoginPanel — Absenden', () => {
  /* Der Link führt dorthin zurück, wo der Login angefangen hat — nicht auf
     die Startseite. Die Absicht fährt als Parameter mit durch den Posteingang. */
  it('schickt die Adresse mit der Rückkehr-Adresse los', () => {
    auth.intent = { starterMustEatId: 'me-9' };
    const { container } = panel();
    fireEvent.change(container.querySelector('input[type="email"]')!, {
      target: { value: 'lukas@example.com' },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(auth.sendLink).toHaveBeenCalledTimes(1);
    const [email, continueUrl] = auth.sendLink.mock.calls[0];
    expect(email).toBe('lukas@example.com');
    expect(continueUrl).toContain('/map?r=sofi');
    expect(continueUrl).toContain('starter=me-9');
  });

  it('sperrt den Knopf, solange die Mail rausgeht', () => {
    auth.magicState = 'sending';
    const { container } = panel();
    expect(button(container, 'Anmelden')!.disabled).toBe(true);
  });

  it('meldet einen Fehler laut', () => {
    auth.magicState = 'error';
    auth.magicError =
      'Zu viele Versuche. Schau ins Postfach – oder probier es in einer Stunde nochmal.';
    const { container } = panel();
    const alert = container.querySelector('[role="alert"]')!;
    expect(alert.textContent).toBe(auth.magicError);
  });
});

describe('LoginPanel — die Ansicht nach dem Absenden', () => {
  beforeEach(() => {
    auth.magicState = 'sent';
  });

  it('zeigt, dass die Mail raus ist, und wo sie sonst liegen könnte', () => {
    const { container } = panel();
    expect(container.textContent).toContain('Mail ist raus');
    expect(container.textContent).toContain('Spam-Ordner');
    // Das Formular ist weg — hier gibt es nichts mehr einzutippen.
    expect(container.querySelector('input[type="email"]')).toBeNull();
  });

  it('schickt dieselbe Adresse noch einmal los', () => {
    auth.magicState = 'idle';
    const { container, rerender } = panel();
    fireEvent.change(container.querySelector('input[type="email"]')!, {
      target: { value: 'lukas@example.com' },
    });
    auth.magicState = 'sent';
    rerender(<LoginPanel onBack={onBack} mode="starter" />);

    expect(container.textContent).toContain('lukas@example.com');
    fireEvent.click(button(container, 'Nochmal')!);
    expect(auth.sendLink).toHaveBeenCalledWith(
      'lukas@example.com',
      expect.stringContaining('/map')
    );
  });

  it('räumt das Feld, wenn jemand eine andere Adresse nehmen will', () => {
    auth.magicState = 'idle';
    const { container, rerender } = panel();
    fireEvent.change(container.querySelector('input[type="email"]')!, {
      target: { value: 'lukas@example.com' },
    });
    auth.magicState = 'sent';
    rerender(<LoginPanel onBack={onBack} mode="starter" />);

    fireEvent.click(button(container, 'Andere Adresse')!);
    expect(auth.magicReset).toHaveBeenCalled();
    expect(container.textContent).not.toContain('lukas@example.com');
  });

  /* CTAs sind ein Wort, wo eins reicht — was der Knopf bringt, steht in der
     Tafel darüber. */
  it('beschriftet beide Ausgänge kurz', () => {
    const { container } = panel();
    expect(button(container, 'Nochmal')).toBeTruthy();
    expect(button(container, 'Andere Adresse')).toBeTruthy();
    expect(container.textContent).not.toContain('Mail erneut senden');
    expect(container.textContent).not.toContain('Andere E-Mail nehmen');
  });
});
