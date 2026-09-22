// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';

const fb = vi.hoisted(() => ({
  isSignInWithEmailLink: vi.fn(() => true),
  signInWithEmailLink: vi.fn(),
  applyActionCode: vi.fn(),
  updateProfile: vi.fn(),
}));
vi.mock('firebase/auth', () => fb);

const store = vi.hoisted(() => ({ doc: vi.fn(() => 'doc-ref'), setDoc: vi.fn() }));
vi.mock('firebase/firestore', () => store);
vi.mock('@/lib/firebase/config', () => ({ auth: {}, getDb: vi.fn(async () => ({})) }));

const analytics = vi.hoisted(() => ({ handoffEvent: vi.fn() }));
vi.mock('@/lib/analytics', () => analytics);

/* Stabile Instanz: der Effekt der Seite hängt an [params] — ein Mock, der pro
   Aufruf ein neues URLSearchParams liefert, dreht ihn in eine Endlosschleife.
   Die Adresse wechselt deshalb pro Test über diesen Halter, nicht pro Aufruf. */
const nav = vi.hoisted(() => ({ params: new URLSearchParams('') }));
vi.mock('next/navigation', () => ({ useSearchParams: () => nav.params }));

import AuthActionPage from './page';
import { buildLoginContinueUrl } from '@/lib/auth/loginContinueUrl';

/**
 * Die Continue-URL wird GEBAUT, nicht getippt.
 *
 * Bis zum 20.09.2026 schrieb dieser Test `claim=1` von Hand in die Adresse —
 * einen Marker, den seit dem 06.09.2026 niemand mehr setzt. Die Seite las ihn,
 * der Test bestaetigte das Lesen, und in Produktion rannte der Faden ins
 * Leere, ohne dass irgendwo etwas rot wurde. Wer beide Seiten prueft, muss die
 * Adresse von der Stelle bauen lassen, die sie auch in echt baut.
 */
function continueUrlFromTappedCard(mustEatId: string) {
  return buildLoginContinueUrl(
    { origin: 'https://staging.example', pathname: '/map', search: '?r=spot' },
    { starterMustEatId: mustEatId }
  );
}

/** Baut die Adresse, mit der der Magic-Link auf /welcome landet. */
function arriveWithLink(continueUrl: string) {
  nav.params = new URLSearchParams(
    `mode=signIn&oobCode=abc&continueUrl=${encodeURIComponent(continueUrl)}`
  );
}

async function mount() {
  let container!: HTMLElement;
  await act(async () => {
    ({ container } = render(<AuthActionPage />));
  });
  return container;
}

function buttonWith(container: HTMLElement, text: string) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;
}

beforeEach(() => {
  vi.clearAllMocks();
  fb.isSignInWithEmailLink.mockReturnValue(true);
  fb.signInWithEmailLink.mockResolvedValue({ user: { displayName: 'Wer' } });
  fb.updateProfile.mockResolvedValue(undefined);
  store.setDoc.mockResolvedValue(undefined);
  localStorage.clear();
  const fromCard = new URL(continueUrlFromTappedCard('must-eat-1'));
  fromCard.searchParams.set('e', 'test@example.com');
  arriveWithLink(fromCard.toString());
});

describe('/welcome mit Sign-in-Link', () => {
  it('löst den Code beim LADEN nicht ein — Scanner rendern diese Seite mit JS', async () => {
    /* Der einmalige Code ging auf Staging zweimal an einen Postfach-Scanner
       verloren, der den alten Auto-Sign-in komplett selbst ausführte
       (26.08.2026, auth/invalid-action-code auf sekundenfrische Codes). Ein
       Button klickt sich nicht von allein — das ist die ganze Abwehr. */
    const container = await mount();
    expect(fb.signInWithEmailLink).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Anmelden');
    // Der Klick beantwortet eine echte Frage: als WER melde ich mich an?
    expect(container.textContent).toContain('test@example.com');
    // Der Faden zu der angetippten Karte reisst nicht ab.
    expect(container.textContent).toContain('Deine Karte ist im Pack dabei.');
  });

  it('meldet erst nach dem Klick an', async () => {
    const container = await mount();
    await act(async () => {
      buttonWith(container, 'Anmelden').click();
    });
    expect(fb.signInWithEmailLink).toHaveBeenCalledTimes(1);
    expect(fb.signInWithEmailLink.mock.calls[0][1]).toBe('test@example.com');
  });

  it('zeigt die Sackgasse, wenn der Code beim Klick schon verbraucht ist', async () => {
    fb.signInWithEmailLink.mockRejectedValue({ code: 'auth/invalid-action-code' });
    const container = await mount();
    await act(async () => {
      buttonWith(container, 'Anmelden').click();
    });
    expect(container.textContent).toContain('Dieser Link geht nicht mehr');
  });
});

/* Wer zwei Links an verschiedene Adressen anfordert und den älteren öffnet,
   meldete sich als die falsche Person an: der localStorage hielt noch die
   Adresse der ZWEITEN Anfrage, und Firebase gab dafür „expired" zurück. Der
   Link kennt seine Adresse selbst — sie hat Vorrang. */
describe('/welcome — welche Adresse gewinnt', () => {
  it('nimmt die Adresse aus dem Link, nicht die zuletzt gemerkte', async () => {
    localStorage.setItem('emailForSignIn', 'zuletzt@example.com');
    arriveWithLink('https://staging.example/?e=im-link%40example.com');

    const container = await mount();
    expect(container.textContent).toContain('im-link@example.com');
    expect(container.textContent).not.toContain('zuletzt@example.com');

    await act(async () => {
      buttonWith(container, 'Anmelden').click();
    });
    expect(fb.signInWithEmailLink.mock.calls[0][1]).toBe('im-link@example.com');
  });

  it('fällt auf die gemerkte Adresse zurück, wenn der Link keine trägt', async () => {
    localStorage.setItem('emailForSignIn', 'gemerkt@example.com');
    arriveWithLink('https://staging.example/map?r=spot');

    const container = await mount();
    expect(container.textContent).toContain('gemerkt@example.com');
  });
});

/* Alte Links ohne den `e`-Träger, geöffnet in einem anderen Browser als dem,
   der sie angefordert hat. Firebase braucht die Adresse, um den Sign-in
   abzuschliessen — hier tippt der Mensch sie ein. */
describe('/welcome — needs-email', () => {
  beforeEach(() => {
    arriveWithLink('https://staging.example/map?r=spot');
  });

  it('fragt nach der Adresse, wenn weder Link noch Speicher eine hält', async () => {
    const container = await mount();
    expect(container.textContent).toContain('Fast drin');
    expect(container.querySelector('input[type="email"]')).toBeTruthy();
    expect(fb.signInWithEmailLink).not.toHaveBeenCalled();
  });

  it('meldet mit der eingetippten Adresse an', async () => {
    const container = await mount();
    const input = container.querySelector('input[type="email"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: '  fremd@example.com  ' } });
    });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    // Getrimmt — abgetippte Adressen tragen gern ein Leerzeichen mit.
    expect(fb.signInWithEmailLink.mock.calls[0][1]).toBe('fremd@example.com');
  });

  it('zeigt die Sackgasse, wenn der Code dabei schon verbraucht war', async () => {
    fb.signInWithEmailLink.mockRejectedValue({ code: 'auth/expired-action-code' });
    const container = await mount();
    const input = container.querySelector('input[type="email"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'fremd@example.com' } });
    });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    expect(container.textContent).toContain('Dieser Link geht nicht mehr');
  });

  it('bleibt im Formular und meldet eine ungültige Adresse', async () => {
    fb.signInWithEmailLink.mockRejectedValue({ code: 'auth/invalid-email' });
    const container = await mount();
    const input = container.querySelector('input[type="email"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'krumm' } });
    });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    expect(container.textContent).toContain('Bitte gib eine gültige E-Mail-Adresse ein.');
    expect(container.textContent).not.toContain('Dieser Link geht nicht mehr');
  });
});

/* Ein neues Konto hat noch keinen Namen. Statt weiterzuleiten fragt die Seite
   einmal nach Name und Avatar — und sagt dabei, dass es danach zurück auf die
   Map geht, sonst ist das Formular eine Unterbrechung ohne erkennbaren Grund. */
describe('/welcome — needs-identity', () => {
  beforeEach(() => {
    fb.signInWithEmailLink.mockResolvedValue({ user: { uid: 'u-1', displayName: null } });
  });

  it('fragt nach Name und Avatar, statt weiterzuleiten', async () => {
    const container = await mount();
    await act(async () => {
      buttonWith(container, 'Anmelden').click();
    });
    expect(container.textContent).toContain('Wer bist du');
    expect(container.textContent).toContain('Dein Name');
    // Der Faden zurück zu der einen Karte, für die das hier alles passiert.
    expect(container.textContent).toContain('deine Karte liegt dann offen im Pack');
    expect(analytics.handoffEvent).toHaveBeenCalledWith('sign_up', { method: 'email_link' });
  });

  it('zählt einen Wiederkehrer als login, nicht als sign_up', async () => {
    fb.signInWithEmailLink.mockResolvedValue({ user: { uid: 'u-2', displayName: 'Lukas' } });
    const container = await mount();
    await act(async () => {
      buttonWith(container, 'Anmelden').click();
    });
    expect(analytics.handoffEvent).toHaveBeenCalledWith('login', { method: 'email_link' });
    expect(container.textContent).not.toContain('Wer bist du');
  });

  it('lässt sich ohne Namen nicht absenden', async () => {
    const container = await mount();
    await act(async () => {
      buttonWith(container, 'Anmelden').click();
    });
    expect(buttonWith(container, 'Weiter').disabled).toBe(true);
  });

  it('speichert Name und Avatar und merkt sich beides lokal', async () => {
    const container = await mount();
    await act(async () => {
      buttonWith(container, 'Anmelden').click();
    });

    const nameInput = container.querySelector('#ob-name') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: '  Lukas  ' } });
    });
    // Avatar 3 statt der Vorauswahl 2.
    const avatars = [...container.querySelectorAll('[role="radio"]')] as HTMLButtonElement[];
    await act(async () => {
      avatars[2].click();
    });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });

    expect(fb.updateProfile).toHaveBeenCalledWith(expect.anything(), { displayName: 'Lukas' });
    expect(store.setDoc).toHaveBeenCalledWith('doc-ref', { avatar: 3 }, { merge: true });
    expect(localStorage.getItem('eatthis_avatar_u-1')).toBe('3');
    // Der Hinweis, aus dem die Seite vor der Hydration Name und Avatar zeigt.
    expect(JSON.parse(localStorage.getItem('_authHint')!)).toEqual({ n: 'Lukas', a: 3, u: 'u-1' });
  });

  it('bleibt im Formular, wenn das Speichern scheitert', async () => {
    fb.updateProfile.mockRejectedValue(new Error('offline'));
    const container = await mount();
    await act(async () => {
      buttonWith(container, 'Anmelden').click();
    });
    const nameInput = container.querySelector('#ob-name') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Lukas' } });
    });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    expect(container.textContent).toContain('Etwas ist schiefgelaufen.');
    expect(buttonWith(container, 'Weiter').disabled).toBe(false);
  });
});

describe('/welcome ohne brauchbaren Link', () => {
  it('zeigt die Sackgasse, wenn Firebase den Link nicht als Sign-in erkennt', async () => {
    fb.isSignInWithEmailLink.mockReturnValue(false);
    const container = await mount();
    expect(container.textContent).toContain('Dieser Link geht nicht mehr');
    // Der Ausgang ist kurz beschriftet — was er bringt, steht darüber.
    expect(container.textContent).toContain('Startseite');
    expect(container.textContent).not.toContain('Zur Startseite');
  });
});

afterEach(() => vi.unstubAllEnvs());

describe('local identity preview', () => {
  it('allows reviewing name and character without signing in or saving', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    nav.params = new URLSearchParams('preview=identity');
    const container = await mount();
    expect(container.textContent).toContain('Wer bist du?');
    fireEvent.change(container.querySelector('#ob-name')!, { target: { value: 'Testname' } });
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    try {
      fireEvent.submit(container.querySelector('form')!);
    } finally {
      vi.unstubAllGlobals();
    }
    // Weiter in die Tour-Vorschau — dort liegt die Pack-Animation.
    expect(assign).toHaveBeenCalledWith('/?preview=welcome');
    expect(fb.signInWithEmailLink).not.toHaveBeenCalled();
    expect(fb.updateProfile).not.toHaveBeenCalled();
    expect(store.setDoc).not.toHaveBeenCalled();
  });

  it('previews the confirmation and moves to identity without consuming a link', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    nav.params = new URLSearchParams('preview=confirm');
    const container = await mount();
    expect(container.textContent).toContain('du@beispiel.de');
    fireEvent.click(buttonWith(container, 'Anmelden'));
    expect(container.querySelector('#ob-name')).not.toBeNull();
    expect(fb.signInWithEmailLink).not.toHaveBeenCalled();
    expect(fb.updateProfile).not.toHaveBeenCalled();
  });

  it.each(['identity', 'loading', 'confirm'])(
    'does not enable %s preview in production',
    async (preview) => {
      vi.stubEnv('NODE_ENV', 'production');
      nav.params = new URLSearchParams({ preview });
      const container = await mount();
      expect(container.textContent).toContain('Dieser Link geht nicht mehr');
      expect(container.querySelector('#ob-name')).toBeNull();
    }
  );
});

/* EN seit 21.09.2026: bis dahin sprach /welcome nur Deutsch, auch mit einem
   Link von /en. Die Sprache kommt aus der Continue-URL (`lang`, gesetzt von
   sendMagicLinkEmail). */
describe('/welcome auf Englisch', () => {
  function arriveInEnglish() {
    const cu = new URL(continueUrlFromTappedCard('must-eat-1'));
    cu.pathname = '/en/map';
    cu.searchParams.set('e', 'test@example.com');
    cu.searchParams.set('lang', 'en');
    arriveWithLink(cu.toString());
  }

  it('bestaetigt auf Englisch, mit einem Wort im Knopf', async () => {
    arriveInEnglish();
    const container = await mount();
    expect(container.textContent).toContain('One more click');
    expect(container.textContent).toContain('Signing in as');
    expect(container.textContent).toContain('Your card is in the pack.');
    expect(buttonWith(container, 'Sign in')).toBeTruthy();
    expect(container.textContent).not.toContain('Anmelden');
    expect(document.documentElement.lang).toBe('en');
  });

  it('fragt nach Name und Avatar auf Englisch', async () => {
    arriveInEnglish();
    fb.signInWithEmailLink.mockResolvedValue({ user: { displayName: null } });
    const container = await mount();
    await act(async () => {
      buttonWith(container, 'Sign in').click();
    });
    expect(container.textContent).toContain('Who are you?');
    expect(container.textContent).toContain('Spot Scout');
    expect(container.textContent).not.toMatch(/Wer bist du|Weiter|Schnüffler/);
  });

  it('zeigt die Sackgasse auf Englisch, mit dem Weg nach /en', async () => {
    arriveInEnglish();
    fb.isSignInWithEmailLink.mockReturnValue(false);
    const container = await mount();
    expect(container.textContent).toContain('This link no longer works');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/en');
  });
});

describe('/welcome Tab-Titel', () => {
  it('kommt serverseitig in der Sprache des Links', async () => {
    vi.resetModules();
    vi.doMock('next/headers', () => ({ cookies: async () => ({ toString: () => 'NEXT_LOCALE=de' }) }));
    const { generateMetadata } = await import('./page');
    const cu = 'https://x.test/en?e=a%40b.c&lang=en';
    const en = await generateMetadata({
      searchParams: Promise.resolve({ mode: 'signIn', lang: 'de', continueUrl: cu }),
    });
    expect(en.title).toBe('Sign in');
    const de = await generateMetadata({ searchParams: Promise.resolve({}) });
    expect(de.title).toBe('Anmeldung');
    vi.doUnmock('next/headers');
  });
});
