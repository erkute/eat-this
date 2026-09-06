import { beforeEach, describe, expect, it, vi } from 'vitest';

const UID = 'Z2IJ8CJsEeQVlV5X4TiwhaOE7423';
const FRIEND_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const FRIEND_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const state = vi.hoisted(() => ({
  /* Was unter users/{uid}/referralBonuses mit source == 'invited' liegt. */
  bonuses: [] as Record<string, unknown>[],
  /* Was der letzte Aufruf abgefragt hat — damit der Test beweisen kann, dass
     nach dem EIGENEN Konto gefragt wurde und nach `source: 'invited'`. */
  queried: null as { path: string; field: string; value: unknown; limit: number } | null,
  accounts: {} as Record<string, { displayName?: string | null }>,
  profiles: {} as Record<string, unknown>,
  authThrows: false,
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/admin', () => {
  const firestore = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        collection: (sub: string) => ({
          where: (field: string, _op: string, value: unknown) => ({
            limit: (limit: number) => ({
              get: async () => {
                state.queried = { path: `${name}/${id}/${sub}`, field, value, limit };
                return { docs: state.bonuses.map((data) => ({ data: () => data })) };
              },
            }),
          }),
        }),
      }),
    }),
    doc: (path: string) => ({ path }),
    getAll: async (...refs: { path: string }[]) =>
      refs.map((ref) => {
        const id = ref.path.split('/')[1];
        return { id, data: () => state.profiles[id] };
      }),
  };
  return {
    getAdminFirestore: () => firestore,
    getAdminAuth: () => ({
      getUsers: async (ids: { uid: string }[]) => {
        if (state.authThrows) throw new Error('auth down');
        return {
          users: ids
            .filter(({ uid }) => state.accounts[uid])
            .map(({ uid }) => ({ uid, ...state.accounts[uid] })),
        };
      },
    }),
  };
});

import { getFriendCards } from './friends.server';

beforeEach(() => {
  state.bonuses = [];
  state.queried = null;
  state.accounts = {};
  state.profiles = {};
  state.authThrows = false;
});

describe('getFriendCards', () => {
  /* Die Liste kommt aus den EIGENEN Bonus-Dokumenten. Gaebe es einen Weg, sie
     nach einer fremden uid zu fragen, waere die Funktion ein Verzeichnis, das
     zu jeder Kontokennung einen Vornamen ausspuckt — und Kontokennungen
     stehen in jedem geteilten Deck-Link. */
  it('fragt nur die Bonus-Dokumente des eigenen Kontos, und nur die Werber-Seite', async () => {
    state.bonuses = [{ partnerUid: FRIEND_A, source: 'invited' }];
    state.accounts[FRIEND_A] = { displayName: 'Dana Joy Altman' };

    await getFriendCards(UID);

    expect(state.queried?.path).toBe(`users/${UID}/referralBonuses`);
    expect(state.queried?.field).toBe('source');
    // 'invited-by' ist der eigene Willkommens-Bonus: dort steht in partnerUid
    // der, der EINEN SELBST geworben hat.
    expect(state.queried?.value).toBe('invited');
  });

  it('gibt Vorname und Figur heraus, sonst nichts', async () => {
    state.bonuses = [{ partnerUid: FRIEND_A, source: 'invited' }];
    state.accounts[FRIEND_A] = { displayName: 'Dana Joy Altman' };
    state.profiles[FRIEND_A] = { avatar: 3, email: 'geheim@example.com' };

    const friends = await getFriendCards(UID);

    expect(friends).toEqual([{ uid: FRIEND_A, name: 'Dana', avatar: 3 }]);
    expect(JSON.stringify(friends)).not.toContain('geheim@example.com');
  });

  it('faellt bei fehlendem Namen und kaputtem Avatar auf brauchbare Werte zurueck', async () => {
    state.bonuses = [{ partnerUid: FRIEND_A, source: 'invited' }];
    state.accounts[FRIEND_A] = { displayName: null };
    state.profiles[FRIEND_A] = { avatar: 99 };

    expect(await getFriendCards(UID)).toEqual([{ uid: FRIEND_A, name: null, avatar: 1 }]);
  });

  /* Geloeschte Konten sind der Normalfall, nicht der Fehlerfall: die Reihe
     verliert eine Figur, nicht alle. */
  it('laesst ein geloeschtes Konto still heraus', async () => {
    state.bonuses = [
      { partnerUid: FRIEND_A, source: 'invited' },
      { partnerUid: FRIEND_B, source: 'invited' },
    ];
    state.accounts[FRIEND_B] = { displayName: 'John' };

    expect((await getFriendCards(UID)).map((f) => f.uid)).toEqual([FRIEND_B]);
  });

  /* Die Reihenfolge der Bonus-Dokumente, nicht die der Auth-Antwort — sonst
     springt die Reihe bei jedem Laden. */
  it('behaelt die Reihenfolge der Bonus-Dokumente', async () => {
    state.bonuses = [
      { partnerUid: FRIEND_B, source: 'invited' },
      { partnerUid: FRIEND_A, source: 'invited' },
    ];
    state.accounts[FRIEND_A] = { displayName: 'Dana' };
    state.accounts[FRIEND_B] = { displayName: 'John' };

    expect((await getFriendCards(UID)).map((f) => f.uid)).toEqual([FRIEND_B, FRIEND_A]);
  });

  it('ueberspringt kaputte partnerUids', async () => {
    state.bonuses = [
      { partnerUid: 'kurz', source: 'invited' },
      { partnerUid: 42, source: 'invited' },
      { source: 'invited' },
    ];

    expect(await getFriendCards(UID)).toEqual([]);
  });

  it('antwortet auf eine unbrauchbare eigene uid mit einer leeren Reihe', async () => {
    expect(await getFriendCards('kurz')).toEqual([]);
    expect(state.queried).toBeNull();
  });

  /* Faellt die Namensabfrage aus, verschwindet die Reihe — statt eine Reihe
     namenloser Figuren zu zeigen, die auf fremde Decks zeigen. */
  it('gibt nichts heraus, wenn die Namensabfrage scheitert', async () => {
    state.bonuses = [{ partnerUid: FRIEND_A, source: 'invited' }];
    state.authThrows = true;

    expect(await getFriendCards(UID)).toEqual([]);
  });
});
