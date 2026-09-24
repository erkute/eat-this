// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { translations } from '@/lib/i18n/translations';

const magic = vi.hoisted(() => ({
  sendLink: vi.fn(),
  reset: vi.fn(),
  state: 'idle' as 'idle' | 'sending' | 'sent' | 'error',
  errorMessage: '',
}));

/** Der Google-Weg, auf das reduziert, was die Tafel davon zeigt. */
const google = vi.hoisted(() => ({
  start: vi.fn(),
  prepare: vi.fn(),
  phase: 'idle' as 'idle' | 'busy' | 'done' | 'leaving',
  note: null as 'cancelled' | 'blocked' | 'failed' | null,
  noteKey: null as string | null,
}));

vi.mock('@/lib/auth', () => ({
  useMagicLink: () => ({
    sendLink: magic.sendLink,
    state: magic.state,
    errorMessage: magic.errorMessage,
    reset: magic.reset,
  }),
  useGoogleSignIn: () => google,
}));
/* Der Wartescreen hat seine eigenen Tests; hier zaehlt nur, ob er da ist. */
vi.mock('./AuthScreen', () => ({
  default: ({ leaving }: { leaving?: boolean }) => (
    <div data-testid="auth-screen" data-leaving={leaving ? '1' : '0'} />
  ),
}));

import LoginBoard, { LoginSceneArt } from './LoginBoard';

type Props = Partial<Parameters<typeof LoginBoard>[0]>;

function board(props: Props = {}, locale: 'de' | 'en' = 'de') {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={translations[locale]}
      timeZone="Europe/Berlin"
    >
      <LoginBoard
        art={<LoginSceneArt reason={null} />}
        title="Starter Pack"
        lead="20 Must Eats"
        googleWarmup="intent"
        {...props}
      />
    </NextIntlClientProvider>
  );
}

const email = () => screen.getByLabelText('E-Mail');
const submit = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Anmelden' });
const googleButton = () =>
  screen.getByRole<HTMLButtonElement>('button', { name: 'Mit Google anmelden' });

beforeEach(() => {
  vi.clearAllMocks();
  magic.state = 'idle';
  magic.errorMessage = '';
  google.phase = 'idle';
  google.note = null;
  google.noteKey = null;
  window.history.replaceState(null, '', '/map?r=sofi');
});

afterEach(() => cleanup());

describe('LoginBoard — Aufbau', () => {
  /* „Anmelden" stand im alten Modal dreimal da. Der Titel sagt, was man
     bekommt — das Wort bleibt dem Knopf. */
  it('traegt eine Ueberschrift, und die heisst nie „Anmelden"', () => {
    const { container } = board();
    const headings = [...container.querySelectorAll('h1, h2, h3')].map((h) => h.textContent);
    expect(headings).toEqual(['Starter Pack']);
    expect(submit()).toBeTruthy();
  });

  it('bietet Google neben der Mail an, in beiden Sprachen', () => {
    board();
    expect(googleButton()).toBeTruthy();
    cleanup();
    board({}, 'en');
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it('nennt AGB und Datenschutz', () => {
    board();
    expect(screen.getByRole('link', { name: 'AGB' }).getAttribute('href')).toBe('/agb');
    expect(screen.getByRole('link', { name: 'Datenschutzerklärung' })).toBeTruthy();
  });

  // Kein Geschenk-Wording (Betreiber, 22.09.2026).
  it('sagt nirgends gratis oder kostenlos', () => {
    const { container } = board();
    expect(container.textContent).not.toMatch(/gratis|kostenlos/i);
  });
});

describe('LoginBoard — Absenden', () => {
  it('haelt eine leere Adresse zurueck und sagt warum', () => {
    board();
    fireEvent.click(submit());
    expect(screen.getByRole('alert').textContent).toBe('Bitte gib deine E-Mail ein.');
    expect(magic.sendLink).not.toHaveBeenCalled();
  });

  it('haelt eine kaputte Adresse zurueck und sagt warum', () => {
    board();
    fireEvent.change(email(), { target: { value: 'nope' } });
    fireEvent.click(submit());
    expect(screen.getByRole('alert').textContent).toBe(
      'Das sieht noch nicht nach einer E-Mail aus.'
    );
    expect(magic.sendLink).not.toHaveBeenCalled();
  });

  /* Der Link fuehrt dorthin zurueck, wo die Anmeldung angefangen hat, und
     traegt die Absicht (Herz, Karte) durch den Posteingang. */
  it('schickt die Adresse mit Rueckweg und Absicht los', () => {
    board({ intent: { starterMustEatId: 'me-9' } });
    fireEvent.change(email(), { target: { value: ' lukas@example.com ' } });
    fireEvent.click(submit());

    const [address, continueUrl] = magic.sendLink.mock.calls[0];
    expect(address).toBe('lukas@example.com');
    expect(continueUrl).toContain('/map?r=sofi');
    expect(continueUrl).toContain('starter=me-9');
  });

  it('sperrt den Knopf, solange die Mail rausgeht', () => {
    magic.state = 'sending';
    board();
    expect(submit().disabled).toBe(true);
  });

  it('meldet einen Fehler der Route laut', () => {
    magic.state = 'error';
    magic.errorMessage = 'Zu viele Versuche.';
    board();
    expect(screen.getByRole('alert').textContent).toBe('Zu viele Versuche.');
  });
});

describe('LoginBoard — nach dem Absenden', () => {
  function sendThenSent() {
    const view = board();
    fireEvent.change(email(), { target: { value: 'lukas@example.com' } });
    magic.state = 'sent';
    view.rerender(
      <NextIntlClientProvider locale="de" messages={translations.de} timeZone="Europe/Berlin">
        <LoginBoard
          art={<LoginSceneArt reason={null} />}
          title="Starter Pack"
          googleWarmup="intent"
        />
      </NextIntlClientProvider>
    );
    return view;
  }

  it('zeigt, dass die Mail raus ist, an wen, und wo sie sonst liegen koennte', () => {
    const { container } = sendThenSent();
    expect(container.textContent).toContain('Mail ist raus');
    expect(container.textContent).toContain('lukas@example.com');
    expect(container.textContent).toContain('Spam-Ordner');
    expect(container.querySelector('input[type="email"]')).toBeNull();
  });

  it('nimmt den Google-Knopf weg — und seine Zeile', () => {
    google.note = 'failed';
    google.noteKey = 'auth.errGooglePopup';
    sendThenSent();
    expect(screen.queryByRole('button', { name: 'Mit Google anmelden' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('schickt dieselbe Adresse noch einmal los', () => {
    sendThenSent();
    fireEvent.click(screen.getByRole('button', { name: 'Nochmal' }));
    expect(magic.sendLink).toHaveBeenCalledWith(
      'lukas@example.com',
      expect.stringContaining('/map')
    );
  });

  it('raeumt das Feld, wenn jemand eine andere Adresse nehmen will', () => {
    const { container } = sendThenSent();
    fireEvent.click(screen.getByRole('button', { name: 'Andere Adresse' }));
    expect(magic.reset).toHaveBeenCalled();
    expect(container.textContent).not.toContain('lukas@example.com');
  });
});

describe('LoginBoard — Google', () => {
  /* Auf den Seiten verspricht der Cookie-Hinweis, Google Sign-In lade „nur wenn
     du es nutzt" — also erst, wenn die Hand zum Knopf geht. */
  it('waermt auf den Seiten erst an, wenn die Hand zum Knopf geht', () => {
    board({ googleWarmup: 'intent' });
    expect(google.prepare).not.toHaveBeenCalled();
    fireEvent.pointerEnter(googleButton());
    expect(google.prepare).toHaveBeenCalledTimes(1);
    fireEvent.click(googleButton());
    expect(google.start).toHaveBeenCalledTimes(1);
  });

  // Im Modal frisst der Popup-Blocker ohne Vorlauf den ersten Klick.
  it('waermt im Modal sofort an', () => {
    board({ googleWarmup: 'mount' });
    expect(google.prepare).toHaveBeenCalled();
  });

  it('sperrt den Knopf und zeigt den Wartescreen, solange Google offen ist', () => {
    google.phase = 'busy';
    board();
    expect(googleButton().disabled).toBe(true);
    expect(screen.getByTestId('auth-screen').getAttribute('data-leaving')).toBe('0');
  });

  it('haelt den Wartescreen auf Wunsch auch ohne Google', () => {
    board({ holdScreen: true });
    expect(screen.getByTestId('auth-screen')).toBeTruthy();
  });

  it('sagt ein selbst zugeklicktes Fenster leise an, ein geblocktes laut', () => {
    google.note = 'cancelled';
    google.noteKey = 'auth.googleCancelled';
    board();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe(translations.de.auth.googleCancelled);

    cleanup();
    google.note = 'blocked';
    google.noteKey = 'auth.errGooglePopupBlocked';
    board();
    expect(screen.getByRole('alert').textContent).toBe(translations.de.auth.errGooglePopupBlocked);
  });
});

describe('LoginSceneArt', () => {
  it('zeigt ohne Anlass das Pack', () => {
    const { container } = render(<LoginSceneArt reason={null} />);
    expect(container.innerHTML).toContain('booster_free.webp');
  });

  it('legt die angetippte Karte vor das Pack', () => {
    const { container } = render(<LoginSceneArt reason={{ kind: 'card', mustEatId: 'me-9' }} />);
    expect(container.innerHTML).toContain('booster_free.webp');
    expect(container.innerHTML).toContain('card-back.webp');
  });

  it('legt beim Herz das Foto des Spots vor das Pack', () => {
    const { container } = render(
      <LoginSceneArt
        reason={{
          kind: 'heart',
          restaurantId: 'sofi',
          name: 'Sofi',
          photo: 'https://cdn.sanity.io/images/p/d/a.jpg',
        }}
      />
    );
    expect(container.innerHTML).toContain('booster_free.webp');
    expect(container.innerHTML).toContain('cdn.sanity.io/images/p/d/a.jpg');
  });
});
