import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  generateLink: vi.fn(),
  getUserByEmail: vi.fn(),
  getEmailSpots: vi.fn(),
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
vi.mock('@/lib/sanity.server', () => ({ getEmailSpots: mocks.getEmailSpots }));
vi.mock('@/emails/SignupEmail', () => ({ default: () => null, SIGNUP_SUBJECT: 'signup' }));
vi.mock('@/emails/LoginEmail', () => ({ default: () => null, LOGIN_SUBJECT: 'login' }));
vi.mock('@/emails/magicLinkText', () => ({
  buildLoginText: () => 'text',
  buildSignupText: () => 'text',
}));

import { rehostMagicLink, sendMagicLinkEmail } from './sendMagicLink';

beforeEach(() => {
  mocks.send.mockReset();
  mocks.send.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  mocks.generateLink.mockReset();
  mocks.generateLink.mockResolvedValue('https://firebase.test/link');
  mocks.getUserByEmail.mockReset();
  mocks.getUserByEmail.mockResolvedValue({ uid: 'user-1' });
  mocks.getEmailSpots.mockReset();
  mocks.getEmailSpots.mockResolvedValue([]);
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
      })
    ).resolves.toEqual({ ok: true });

    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'delivered@resend.dev' }),
      undefined
    );
    expect(mocks.getEmailSpots).not.toHaveBeenCalled();
  });

  it('forwards a stable provider idempotency key', async () => {
    await expect(
      sendMagicLinkEmail({
        email: 'guest@example.com',
        continueUrl: 'https://eatthis.test/profile',
        appUrl: 'https://eatthis.test',
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
        idempotencyKey: 'stripe-guest-magic-link/cs_test',
      })
    ).resolves.toEqual({ ok: true });
  });
});

describe('rehostMagicLink', () => {
  const OOB =
    '?mode=signIn&oobCode=abc123&apiKey=k&continueUrl=https%3A%2F%2Fstaging.example%2Fmap%3Fr%3Dspot%26claim%3D1&lang=de';

  it("lands the link on the deployment's own /welcome, whatever Firebase says", () => {
    /* Staging sass auf dem Firebase-Default (…firebaseapp.com/__/auth/action),
       dessen Handler stumm zur Continue-URL weiterleitet, ohne je jemanden
       anzumelden — "ich komme auf die Seite, werde aber nicht eingeloggt"
       (User, 26.08.2026). Umstellen geht nicht: Console UND Admin-API lehnen
       mit EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED ab. Also gehört der Host dem
       Server, nicht der Projekt-Einstellung. */
    const out = rehostMagicLink(
      `https://eat-this-staging-8a13b.firebaseapp.com/__/auth/action${OOB}`,
      'https://staging.example/map?r=spot&claim=1'
    );
    const u = new URL(out);
    expect(u.origin).toBe('https://staging.example');
    expect(u.pathname).toBe('/welcome');
  });

  it('keeps the query untouched — the oobCode IS the sign-in', () => {
    const out = rehostMagicLink(
      `https://eat-this-staging-8a13b.firebaseapp.com/__/auth/action${OOB}`,
      'https://staging.example/'
    );
    expect(new URL(out).search).toBe(OOB);
  });

  it('would rather send the unrewritten link than no mail at all', () => {
    // Nicht-absolute continueUrl — derselbe Legacy-Fallback, den der
    // e-Param-Code schon toleriert.
    const raw = `https://x.firebaseapp.com/__/auth/action${OOB}`;
    expect(rehostMagicLink(raw, '/map')).toBe(raw);
  });

  it('is a no-op on production, whose action URL already points home', () => {
    const prodLink = `https://www.eatthisdot.com/welcome${OOB}`;
    expect(rehostMagicLink(prodLink, 'https://www.eatthisdot.com/map?r=spot')).toBe(prodLink);
  });
});
