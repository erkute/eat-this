import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ set: vi.fn(), redirect: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: mocks.set }) }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
import { setCounting } from './actions';

function form(choice: string, locale = 'de') {
  const data = new FormData();
  data.set('choice', choice);
  data.set('locale', locale);
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe('public counting choice', () => {
  it('excludes this browser for one year, readable by the existing GA gate', async () => {
    await setCounting(form('exclude'));
    expect(mocks.set).toHaveBeenCalledWith('eatthis_nocount', '1', {
      path: '/', maxAge: 31536000, sameSite: 'lax',
    });
    expect(mocks.redirect).toHaveBeenCalledWith('/no-count?choice=exclude');
  });

  it('removes the same cookie when counting is enabled again', async () => {
    await setCounting(form('include', 'en'));
    expect(mocks.set).toHaveBeenCalledWith('eatthis_nocount', '', {
      path: '/', maxAge: 0, sameSite: 'lax',
    });
    expect(mocks.redirect).toHaveBeenCalledWith('/en/no-count?choice=include');
  });

  it('rejects an unknown choice without touching cookies', async () => {
    await expect(setCounting(form('something-else'))).rejects.toThrow('Invalid counting choice');
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('never redirects to a user-supplied destination', async () => {
    await setCounting(form('exclude', 'https://example.com'));
    expect(mocks.redirect).toHaveBeenCalledWith('/no-count?choice=exclude');
  });
});
