// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('next-intl', () => ({ useLocale: () => locale.current }));
const locale = vi.hoisted(() => ({ current: 'de' }));

const fb = vi.hoisted(() => ({
  isSignInWithEmailLink: vi.fn(() => true),
  signInWithEmailLink: vi.fn(),
}));
vi.mock('firebase/auth', () => fb);
vi.mock('@/lib/firebase/config', () => ({ auth: {} }));

const nav = vi.hoisted(() => ({ push: vi.fn(), pathname: '/map' }));
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: nav.push }),
  usePathname: () => nav.pathname,
}));

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock('@/lib/analytics', () => analytics);

const heart = vi.hoisted(() => ({ remember: vi.fn() }));
vi.mock('@/lib/map/pendingHeart', () => ({ rememberPendingHeart: heart.remember }));

/* Ob die Tour kommt, meldet sonst der Starter-Pack-Abgleich — hier gesteuert. */
const arrival = vi.hoisted(() => ({ arrivalDecided: vi.fn() }));
vi.mock('@/lib/auth/signInArrival', () => arrival);

import EmailLinkSignIn from './EmailLinkSignIn';

/** Landing URL; fixtures may include an untrusted email parameter. */
function arriveWith(query: string, path = '/map') {
  window.history.replaceState(null, '', `${path}?${query}`);
}

async function mount() {
  await act(async () => {
    render(<EmailLinkSignIn />);
  });
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.clearAllMocks();
  locale.current = 'de';
  fb.isSignInWithEmailLink.mockReturnValue(true);
  fb.signInWithEmailLink.mockResolvedValue({ user: { uid: 'u1', displayName: null } });
  arrival.arrivalDecided.mockResolvedValue(true);
  nav.pathname = '/map';
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('emailForSignIn', 'gast@example.com');
  arriveWith('r=spot&mode=signIn&oobCode=abc&apiKey=k&e=gast%40example.com');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
  });

  it('zaehlt einen Wiederkehrer als login', async () => {
    fb.signInWithEmailLink.mockResolvedValue({ user: { uid: 'u1', displayName: 'Lukas' } });
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(analytics.trackEvent).toHaveBeenCalledWith('login', { method: 'email_link' });
  });

  /* Nach jeder Anmeldung ins Profil — egal wo sie anfing (Betreiber,
     14.10.2026). Die Tour eines neuen Kontos laeuft dort weiter, sie haengt
     im Locale-Layout. */
  it('schickt nach dem Klick ins Profil, auch ein neues Konto', async () => {
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(nav.push).toHaveBeenCalledWith('/profile');
  });

  /* Bis 14.10.2026 ging es sofort ins Profil, und das stand offen da, bis
     die Tour aufging (Betreiber: „man darf nicht im Vorfeld das Profil
     sehen"). */
  it('bleibt stehen, bis feststeht, ob die Tour kommt — erst dann ins Profil', async () => {
    let decide: (granted: boolean) => void = () => {};
    arrival.arrivalDecided.mockReturnValue(new Promise((resolve) => (decide = resolve)));
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(arrival.arrivalDecided).toHaveBeenCalledWith('u1');
    expect(screen.getByRole('button', { name: 'Anmelden …' })).toBeTruthy();
    expect(nav.push).not.toHaveBeenCalled();
    await act(async () => decide(true));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(nav.push).toHaveBeenCalledWith('/profile');
  });

  it('schickt auch nach einer angetippten Karte ins Profil', async () => {
    arriveWith('starter=me-1&mode=signIn&oobCode=abc&apiKey=k&e=gast%40example.com');
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(nav.push).toHaveBeenCalledWith('/profile');
  });

  it('bleibt im Profil, wenn der Link dort landet', async () => {
    nav.pathname = '/profile';
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(nav.push).not.toHaveBeenCalled();
  });

  /* Die Google-Anmeldung meldet sich per Ereignis (LoginBoard, AuthContext). */
  it('schickt nach einer Google-Anmeldung ins Profil', async () => {
    await mount();
    await act(async () => {
      window.dispatchEvent(new Event('eatthis:signed-in'));
    });
    expect(nav.push).toHaveBeenCalledWith('/profile');
  });

  it('steht sofort, bevor Firebase geladen ist', async () => {
    render(<EmailLinkSignIn />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => {});
  });

  it('ignoriert die Link-Adresse zugunsten des lokal begonnenen Logins', async () => {
    localStorage.setItem('emailForSignIn', 'zuletzt@example.com');
    await mount();
    expect(screen.getByText('zuletzt@example.com')).toBeTruthy();
    expect(screen.queryByText('gast@example.com')).toBeNull();
  });

  it('sagt beim angetippten Kartenweg, dass die Karte im Pack ist', async () => {
    arriveWith('starter=me-1&mode=signIn&oobCode=abc&apiKey=k&e=gast%40example.com');
    await mount();
    expect(screen.getByText('Deine Karte ist im Pack dabei.')).toBeTruthy();
    expect(window.location.search).toBe('');
    /* Gemerkt wird erst beim Anmelden — die Frist beginnt dann. */
    expect(sessionStorage.getItem('eatthis_pending_starter_card')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(sessionStorage.getItem('eatthis_pending_starter_card')).toContain('me-1');
  });

  it('nimmt ein ausstehendes Herz mit ins Profil — gemerkt vor der Anmeldung', async () => {
    arriveWith('heart=spot-9&mode=signIn&oobCode=abc&apiKey=k');
    fb.signInWithEmailLink.mockImplementation(async () => {
      expect(heart.remember).toHaveBeenCalledWith('spot-9');
      return { user: { displayName: null } };
    });
    await mount();
    expect(window.location.search).toBe('');
    expect(heart.remember).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(fb.signInWithEmailLink).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith('/profile');
  });

  it('zeigt die Sackgasse, wenn der Code beim Klick schon verbraucht ist', async () => {
    fb.signInWithEmailLink.mockRejectedValue({ code: 'auth/invalid-action-code' });
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    });
    expect(screen.getByText('Dieser Link geht nicht mehr')).toBeTruthy();
    expect(screen.getByRole('img').querySelector('img')?.getAttribute('src')).toContain('starter-pack-front.webp');
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

  it('zeigt die Sackgasse auch unter StrictMode (Effekt laeuft doppelt)', async () => {
    fb.isSignInWithEmailLink.mockReturnValue(false);
    await act(async () => {
      render(
        <StrictMode>
          <EmailLinkSignIn />
        </StrictMode>
      );
    });
    expect(screen.getByText('Dieser Link geht nicht mehr')).toBeTruthy();
  });

  it('zeigt die Sackgasse, wenn Firebase den Link nicht erkennt', async () => {
    fb.isSignInWithEmailLink.mockReturnValue(false);
    await mount();
    expect(screen.getByText('Dieser Link geht nicht mehr')).toBeTruthy();
  });
});

/* Ohne lokal gemerkte Adresse muss der Mensch sie eingeben, auch wenn
   ein fremder Link eine Adresse als Parameter mitbringt. */
describe('ohne bekannte Adresse', () => {
  beforeEach(() => {
    localStorage.clear();
    arriveWith('mode=signIn&oobCode=abc&apiKey=k&e=attacker%40example.com');
  });

  it('fragt nach der Adresse und meldet mit der getippten an', async () => {
    await mount();
    const input = screen.getByLabelText('Deine E-Mail-Adresse');
    expect((input as HTMLInputElement).value).toBe('');
    expect(fb.signInWithEmailLink).not.toHaveBeenCalled();
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

it('lets a reader correct a stale remembered email without trusting the URL', async () => {
  localStorage.setItem('emailForSignIn', 'newer@example.com');
  fb.signInWithEmailLink.mockRejectedValueOnce({ code: 'auth/invalid-email' });
  await mount();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
  });
  const input = screen.getByLabelText('Deine E-Mail-Adresse');
  expect((input as HTMLInputElement).value).toBe('');
  expect(localStorage.getItem('emailForSignIn')).toBeNull();
  fireEvent.change(input, { target: { value: 'original@example.com' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
  });
  expect(fb.signInWithEmailLink.mock.calls.at(-1)?.[1]).toBe('original@example.com');
  expect(screen.queryByRole('dialog')).toBeNull();
});
