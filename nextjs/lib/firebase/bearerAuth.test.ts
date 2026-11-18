import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyIdToken = vi.hoisted(() => vi.fn());
vi.mock('./admin', () => ({ getAdminAuth: () => ({ verifyIdToken }) }));

import { verifyBearer } from './bearerAuth';

const request = (authorization?: string) =>
  new Request('http://x/api', { headers: authorization ? { authorization } : {} });

describe('verifyBearer', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it('reports a missing token without asking Firebase', async () => {
    expect(await verifyBearer(request())).toEqual({ status: 'missing' });
    expect(await verifyBearer(request('Basic abc'))).toEqual({ status: 'missing' });
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('checks the token for revocation and returns who it belongs to', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'a@example.com', email_verified: true });
    expect(await verifyBearer(request('Bearer tok'))).toEqual({
      status: 'ok',
      uid: 'u1',
      email: 'a@example.com',
      token: 'tok',
      identity: { email: 'a@example.com', emailVerified: true, admin: false },
    });
    expect(verifyIdToken).toHaveBeenCalledWith('tok', true);
  });

  it('only takes the admin claim and a verified address at their word when literally true', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email_verified: 'true', admin: 1 });
    const auth = await verifyBearer(request('Bearer tok'));
    expect(auth).toMatchObject({
      status: 'ok',
      email: null,
      identity: { email: null, emailVerified: false, admin: false },
    });
  });

  it('hands back the error of a rejected token', async () => {
    const error = new Error('revoked');
    verifyIdToken.mockRejectedValue(error);
    expect(await verifyBearer(request('Bearer tok'))).toEqual({ status: 'invalid', error });
  });
});
