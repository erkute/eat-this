// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn(() => Promise.resolve('token')),
  fetch: vi.fn(),
}));

vi.mock('@/lib/firebase/config', () => ({
  auth: { currentUser: { getIdToken: mocks.getIdToken } },
  getDb: vi.fn(),
}));

import { rememberPendingHeart } from '../pendingHeart';

const showNotification = vi.fn();

function reload(url = 'https://eatthis.test/map') {
  window.history.replaceState({}, '', new URL(url).pathname + new URL(url).search);
}

beforeEach(() => {
  vi.resetModules();
  mocks.fetch.mockReset().mockResolvedValue({ ok: true });
  showNotification.mockClear();
  window.showNotification = showNotification;
  vi.stubGlobal('fetch', mocks.fetch);
  sessionStorage.clear();
  reload();
});

async function freshSettle(uid: string) {
  // Das Modul merkt sich pro Dokument, dass es eingeloest hat — jeder Test
  // faengt deshalb mit einer frischen Kopie an.
  const { settlePendingHeart: settle } = await import('../pendingHeart');
  return settle(uid, 'de');
}

describe('pendingHeart', () => {
  it('loest das gemerkte Herz ein, sobald ein Konto da ist', async () => {
    rememberPendingHeart('rest-1');
    await freshSettle('user-1');

    expect(mocks.fetch).toHaveBeenCalledWith(
      '/api/heart',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ restaurantId: 'rest-1', action: 'add' }),
      })
    );
    expect(showNotification).toHaveBeenCalledWith('Spot gespeichert', 5000);
    expect(sessionStorage.getItem('eatthis_pending_heart')).toBeNull();
  });

  it('nimmt das Herz auch aus der Adresse — der Weg durch den Posteingang', async () => {
    reload('https://eatthis.test/map?r=vox&heart=rest-2');
    await freshSettle('user-1');

    expect(mocks.fetch).toHaveBeenCalledWith(
      '/api/heart',
      expect.objectContaining({
        body: JSON.stringify({ restaurantId: 'rest-2', action: 'add' }),
      })
    );
    // Der Marker verlaesst die Adresszeile, der offene Spot bleibt stehen.
    expect(window.location.search).toBe('?r=vox');
  });

  it('ruehrt ein abgelaufenes Herz nicht mehr an', async () => {
    sessionStorage.setItem(
      'eatthis_pending_heart',
      JSON.stringify({ id: 'rest-3', at: Date.now() - 11 * 60 * 1000 })
    );
    await freshSettle('user-1');

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(showNotification).not.toHaveBeenCalled();
  });

  it('loest einmal ein, egal wie viele Listen gleichzeitig lesen', async () => {
    rememberPendingHeart('rest-4');
    const { settlePendingHeart: settle } = await import('../pendingHeart');
    await Promise.all([settle('user-1', 'de'), settle('user-1', 'de')]);

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it('sagt Bescheid, wenn das Einloesen scheitert', async () => {
    mocks.fetch.mockResolvedValue({ ok: false, status: 500 });
    rememberPendingHeart('rest-5');
    await freshSettle('user-1');

    expect(showNotification).toHaveBeenCalledWith('Etwas ist schiefgelaufen');
  });

  it('tut nichts, wenn niemand etwas herzen wollte', async () => {
    await freshSettle('user-1');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
