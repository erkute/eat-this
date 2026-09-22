// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('next-intl', () => ({ useLocale: () => locale.current }));
const locale = vi.hoisted(() => ({ current: 'de' }));

const fb = vi.hoisted(() => ({
  isSignInWithEmailLink: vi.fn(() => true),
  signInWithEmailLink: vi.fn(),
}));
vi.mock('firebase/auth', () => fb);
vi.mock('@/lib/firebase/config', () => ({ auth: {} }));

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock('@/lib/analytics', () => analytics);

const arrival = vi.hoisted(() => ({ announceSignIn: vi.fn() }));
vi.mock('@/lib/auth/signInArrival', () => arrival);

import EmailLinkSignIn from './EmailLinkSignIn';

/** Der Link, wie ihn sendMagicLink baut: Zielseite + Code + Adresse. */
function arriveWith(query: string, path = '/map') {
  window.history.replaceState(null, '', `${path}?${query}`);
}

async function mount() {
  await act(async () => {
    render(<EmailLinkSignIn />);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  locale.current = 'de';
  fb.isSignInWithEmailLink.mockReturnValue(true);
  fb.signInWithEmailLink.mockResolvedValue({ user: { displayName: null } });
  localStorage.clear();
  arriveWith('r=spot&mode=signIn&oobCode=abc&apiKey=k&e=gast%40example.com');
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('Link aus der Anmelde-Mail', () => {
  it('bleibt ohne Link in der Adresse aus', async () => {
    arriveWith('r=spot');
    await mount();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fb.isSignInWithEmailLink).not.toHaveBeenCalled();
  });

  it('fragt nach, statt den Code beim Laden einzuloesen — Scanner fuehren JS aus', async () => {
    /* Der einmalige Code ging auf Staging zweimal an einen Postfach-Scanner
       verloren, der einen Auto-Sign-in selbst ausfuehrte (26.08.2026). */
    await mount();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('gast@example.com')).toBeTruthy();
    expect(fb.signInWithEmailLink).not.toHaveBeenCalled();
  });

  it('raeumt Code und Adresse sofort aus der Adresszeile, laesst den Rest stehen', async () => {
    await mount();
    expect(window.location.pathname).toBe('/map');
    expect(window.location.search).toBe('?r=spot');
  });

  it('meldet nach dem Klick an, geht zu und laesst die Tour uebernehmen', async () => {
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(fb.signInWithEmailLink).toHaveBeenCalledTimes(1);
    expect(fb.signInWithEmailLink.mock.calls[0][1]).toBe('gast@example.com');
    // Firebase bekommt den Link, wie er ankam — nicht die aufgeraeumte Adresse.
    expect(fb.signInWithEmailLink.mock.calls[0][2]).toContain('oobCode=abc');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(analytics.trackEvent).toHaveBeenCalledWith('sign_up', { method: 'email_link' });
    // Wiederkehrer bekommen die Zeile, neue Konten die Tour — das entscheidet signInArrival.
    expect(arrival.announceSignIn).toHaveBeenCalledTimes(1);
  });

  it('zaehlt einen Wiederkehrer als login', async () => {
    fb.signInWithEmailLink.mockResolvedValue({ user: { displayName: 'Lukas' } });
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(analytics.trackEvent).toHaveBeenCalledWith('login', { method: 'email_link' });
  });

  it('nimmt die Adresse aus dem Link, nicht die zuletzt gemerkte', async () => {
    localStorage.setItem('emailForSignIn', 'zuletzt@example.com');
    await mount();
    expect(screen.getByText('gast@example.com')).toBeTruthy();
    expect(screen.queryByText('zuletzt@example.com')).toBeNull();
  });

  it('sagt beim angetippten Kartenweg, dass die Karte im Pack ist', async () => {
    arriveWith('starter=me-1&mode=signIn&oobCode=abc&apiKey=k&e=gast%40example.com');
    await mount();
    expect(screen.getByText('Deine Karte ist im Pack dabei.')).toBeTruthy();
    // `starter` loest die Pack-Vergabe nach der Anmeldung ein — er bleibt.
    expect(window.location.search).toBe('?starter=me-1');
  });

  it('zeigt die Sackgasse, wenn der Code beim Klick schon verbraucht ist', async () => {
    fb.signInWithEmailLink.mockRejectedValue({ code: 'auth/invalid-action-code' });
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(screen.getByText('Dieser Link geht nicht mehr')).toBeTruthy();
  });

  it('bleibt bei einem Netzfehler stehen und laesst nochmal druecken', async () => {
    fb.signInWithEmailLink.mockRejectedValue(new Error('offline'));
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(screen.getByRole('alert').textContent).toMatch(/schiefgelaufen/);
    expect((screen.getByRole('button', { name: 'Anmelden' }) as HTMLButtonElement).disabled).toBe(
      false
    );
  });

  it('zeigt die Sackgasse, wenn Firebase den Link nicht erkennt', async () => {
    fb.isSignInWithEmailLink.mockReturnValue(false);
    await mount();
    expect(screen.getByText('Dieser Link geht nicht mehr')).toBeTruthy();
  });
});

/* Ein Link ohne Adresse, geoeffnet in einem Browser, der sich keine gemerkt
   hat. Firebase braucht die Adresse zum Einloesen — hier tippt der Mensch sie. */
describe('ohne bekannte Adresse', () => {
  beforeEach(() => arriveWith('mode=signIn&oobCode=abc&apiKey=k'));

  it('fragt nach der Adresse und meldet mit der getippten an', async () => {
    await mount();
    const input = screen.getByLabelText('Deine E-Mail-Adresse');
    fireEvent.change(input, { target: { value: '  fremd@example.com ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(fb.signInWithEmailLink.mock.calls[0][1]).toBe('fremd@example.com');
  });

  /* Was das Feld selbst als Adresse durchlaesst, Firebase aber nicht. */
  it('meldet eine ungueltige Adresse im Formular', async () => {
    fb.signInWithEmailLink.mockRejectedValue({ code: 'auth/invalid-email' });
    await mount();
    fireEvent.change(screen.getByLabelText('Deine E-Mail-Adresse'), {
      target: { value: 'krumm@x' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(screen.getByRole('alert').textContent).toBe(
      'Bitte gib eine gültige E-Mail-Adresse ein.'
    );
  });
});

describe('auf Englisch', () => {
  it('spricht die Sprache der Seite, auf der der Link landet', async () => {
    locale.current = 'en';
    arriveWith('mode=signIn&oobCode=abc&apiKey=k&e=gast%40example.com', '/en/map');
    await mount();
    expect(screen.getByText('One more click')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });
});
