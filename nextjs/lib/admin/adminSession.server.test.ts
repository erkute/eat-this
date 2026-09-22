import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const verifySessionCookie = vi.fn();
vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifySessionCookie }),
}));

import { isAdminSession } from './adminSession.server';

describe('isAdminSession', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'boss@example.com';
    verifySessionCookie.mockReset();
  });
  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  it('lässt ohne Cookie niemanden durch', async () => {
    expect(await isAdminSession(undefined)).toBe(false);
    expect(verifySessionCookie).not.toHaveBeenCalled();
  });

  it('lässt ein ungültiges Cookie nicht durch', async () => {
    verifySessionCookie.mockRejectedValue(new Error('expired'));
    expect(await isAdminSession('abc')).toBe(false);
  });

  it('lässt ein gewöhnliches Konto nicht durch', async () => {
    verifySessionCookie.mockResolvedValue({ email: 'someone@example.com', email_verified: true });
    expect(await isAdminSession('abc')).toBe(false);
  });

  it('verlangt eine bestätigte Admin-Adresse', async () => {
    verifySessionCookie.mockResolvedValue({ email: 'boss@example.com', email_verified: false });
    expect(await isAdminSession('abc')).toBe(false);
    verifySessionCookie.mockResolvedValue({ email: 'boss@example.com', email_verified: true });
    expect(await isAdminSession('abc')).toBe(true);
  });

  it('nimmt den admin-Claim', async () => {
    verifySessionCookie.mockResolvedValue({ email: 'x@example.com', admin: true });
    expect(await isAdminSession('abc')).toBe(true);
  });
});
