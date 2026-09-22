import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  generateLink: vi.fn(),
  getUserByEmail: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

vi.mock('@/emails/render', () => ({ renderEmail: vi.fn(async () => '<html />') }));
vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({
    generateSignInWithEmailLink: mocks.generateLink,
    getUserByEmail: mocks.getUserByEmail,
  }),
}));
vi.mock('@/emails/SignupEmail', () => ({
  default: () => null,
  SIGNUP_SUBJECT: { de: 'signup', en: 'signup-en' },
}));
vi.mock('@/emails/LoginEmail', () => ({
  default: () => null,
  LOGIN_SUBJECT: { de: 'login', en: 'login-en' },
}));
vi.mock('@/emails/magicLinkText', () => ({
  buildLoginText: () => 'text',
  buildSignupText: () => 'text',
}));

import { landingLink, sendMagicLinkEmail } from './sendMagicLink';

beforeEach(() => {
  mocks.send.mockReset();
  mocks.send.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  mocks.generateLink.mockReset();
  mocks.generateLink.mockResolvedValue('https://firebase.test/link');
  mocks.getUserByEmail.mockReset();
  mocks.getUserByEmail.mockResolvedValue({ uid: 'user-1' });
  vi.stubEnv('RESEND_API_KEY', 're_test');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sendMagicLinkEmail idempotency', () => {
  it('routes staging mail only to the configured test recipient', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENV', 'staging');
    vi.stubEnv('STAGING_EMAIL_RECIPIENT', 'delivered@resend.dev');

    await expect(
      sendMagicLinkEmail({
        email: 'guest@example.com',
        continueUrl: 'https://staging.example.com/welcome',
        appUrl: 'https://staging.example.com',
        locale: 'de',
      })
    ).resolves.toEqual({ ok: true });

    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'delivered@resend.dev' }),
      undefined
    );
  });

  it('forwards a stable provider idempotency key', async () => {
    await expect(
      sendMagicLinkEmail({
        email: 'guest@example.com',
        continueUrl: 'https://eatthis.test/profile',
        appUrl: 'https://eatthis.test',
        locale: 'de',
        idempotencyKey: 'stripe-guest-magic-link/cs_test',
      })
    ).resolves.toEqual({ ok: true });

    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'guest@example.com' }), {
      idempotencyKey: 'stripe-guest-magic-link/cs_test',
    });
  });

  it('treats a prior accepted payload for the same logical key as delivered', async () => {
    mocks.send.mockResolvedValueOnce({
      data: null,
      error: {
        name: 'invalid_idempotent_request',
        message: 'same key, different regenerated action link',
        statusCode: 409,
      },
    });

    await expect(
      sendMagicLinkEmail({
        email: 'guest@example.com',
        continueUrl: 'https://eatthis.test/profile',
        appUrl: 'https://eatthis.test',
        locale: 'de',
        idempotencyKey: 'stripe-guest-magic-link/cs_test',
      })
    ).resolves.toEqual({ ok: true });
  });
});

describe('sendMagicLinkEmail Sprache', () => {
  /* Die Sprache der Mail kommt aus der Seite, auf der angefordert wurde. Die
     Seite, auf der der Link landet, traegt ihre Sprache im Pfad — ein
     `lang`-Traeger ist nicht mehr noetig (und die Middleware beantwortete
     ?lang= mit einem 308). */
  it('waehlt den EN-Betreff und haengt keinen lang-Traeger an', async () => {
    await sendMagicLinkEmail({
      email: 'guest@example.com',
      continueUrl: 'https://eatthis.test/en/map?r=x',
      appUrl: 'https://eatthis.test',
      locale: 'en',
    });
    const url = new URL(mocks.generateLink.mock.calls[0][1].url);
    expect(url.toString()).toBe('https://eatthis.test/en/map?r=x');
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'login-en' }),
      undefined
    );
  });
});

describe('landingLink', () => {
  const OOB =
    '?mode=signIn&oobCode=abc123&apiKey=k&continueUrl=https%3A%2F%2Fstaging.example%2Fmap%3Fr%3Dspot&lang=de';

  it('landet auf der Zielseite selbst, mit Code und Adresse', () => {
    /* Staging sass auf dem Firebase-Default (…firebaseapp.com/__/auth/action),
       dessen Handler stumm weiterleitet, ohne je jemanden anzumelden
       (26.08.2026). Der Host gehoert deshalb der Continue-URL. */
    const out = new URL(
      landingLink(
        `https://eat-this-staging-8a13b.firebaseapp.com/__/auth/action${OOB}`,
        'https://staging.example/map?r=spot&starter=me-1',
        'gast@example.com'
      )
    );
    expect(out.origin).toBe('https://staging.example');
    expect(out.pathname).toBe('/map');
    expect(out.searchParams.get('r')).toBe('spot');
    expect(out.searchParams.get('starter')).toBe('me-1');
    expect(out.searchParams.get('mode')).toBe('signIn');
    expect(out.searchParams.get('oobCode')).toBe('abc123');
    expect(out.searchParams.get('apiKey')).toBe('k');
    expect(out.searchParams.get('e')).toBe('gast@example.com');
  });

  it('laesst continueUrl und Firebases lang weg', () => {
    const out = new URL(
      landingLink(
        `https://x.firebaseapp.com/__/auth/action${OOB}`,
        'https://staging.example/',
        'a@b.c'
      )
    );
    expect(out.searchParams.has('continueUrl')).toBe(false);
    expect(out.searchParams.has('lang')).toBe(false);
  });

  it('schickt lieber den unveraenderten Link als gar keine Mail', () => {
    const raw = `https://x.firebaseapp.com/__/auth/action${OOB}`;
    expect(landingLink(raw, '/map', 'a@b.c')).toBe(raw);
  });
});
