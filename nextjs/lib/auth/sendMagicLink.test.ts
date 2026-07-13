import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  generateLink: vi.fn(),
  getUserByEmail: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = {send: mocks.send};
  },
}));

vi.mock('@react-email/render', () => ({render: vi.fn(async () => '<html />')}));
vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({
    generateSignInWithEmailLink: mocks.generateLink,
    getUserByEmail: mocks.getUserByEmail,
  }),
}));
vi.mock('@/lib/sanity.server', () => ({getEmailSpots: vi.fn(async () => [])}));
vi.mock('@/emails/MagicLinkEmail', () => ({default: () => null}));
vi.mock('@/emails/magicLinkText', () => ({buildMagicLinkText: () => 'text'}));

import {sendMagicLinkEmail} from './sendMagicLink';

beforeEach(() => {
  mocks.send.mockReset();
  mocks.send.mockResolvedValue({data: {id: 'email-1'}, error: null});
  mocks.generateLink.mockReset();
  mocks.generateLink.mockResolvedValue('https://firebase.test/link');
  mocks.getUserByEmail.mockReset();
  mocks.getUserByEmail.mockResolvedValue({uid: 'user-1'});
  vi.stubEnv('RESEND_API_KEY', 're_test');
});

describe('sendMagicLinkEmail idempotency', () => {
  it('forwards a stable provider idempotency key', async () => {
    await expect(sendMagicLinkEmail({
      email: 'guest@example.com',
      continueUrl: 'https://eatthis.test/profile',
      appUrl: 'https://eatthis.test',
      idempotencyKey: 'stripe-guest-magic-link/cs_test',
    })).resolves.toEqual({ok: true});

    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({to: 'guest@example.com'}),
      {idempotencyKey: 'stripe-guest-magic-link/cs_test'},
    );
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

    await expect(sendMagicLinkEmail({
      email: 'guest@example.com',
      continueUrl: 'https://eatthis.test/profile',
      appUrl: 'https://eatthis.test',
      idempotencyKey: 'stripe-guest-magic-link/cs_test',
    })).resolves.toEqual({ok: true});
  });
});
