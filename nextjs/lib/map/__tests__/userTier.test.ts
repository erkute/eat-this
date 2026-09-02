import { describe, it, expect } from 'vitest';
import { resolveUserTier, showsPackPromos, type UserTier } from '../useUserTier';

const UID = 'u1';
const anonSurface = { fullCatalog: false, dataUid: null, authLoading: false };
const starterSurface = { fullCatalog: false, dataUid: UID, authLoading: false };
const fullSurface = { fullCatalog: true, dataUid: UID, authLoading: false };

describe('resolveUserTier', () => {
  it('is anon without a uid once auth has resolved, whatever else is known', () => {
    expect(resolveUserTier({ uid: null, owned: new Set(), ...fullSurface })).toBe('anon');
  });

  it('is pending, not anon, while auth is still resolving', () => {
    // Bis Firebase den Nutzer meldet, ist `uid === null` „unbekannt", nicht
    // „Gast". Vorher stand in diesem Fenster auf jedem Laden das Banner —
    // für Käufer und Admin gleichermaßen, und das SSR-HTML trug es ohnehin.
    expect(
      resolveUserTier({
        uid: null,
        owned: null,
        fullCatalog: false,
        dataUid: null,
        authLoading: true,
      })
    ).toBe('pending');
  });

  it('opens everything for an admin the entitlement listener has never heard of', () => {
    // Das eigene Admin-Konto: null Dokumente unter users/<uid>/entitlements,
    // der Zugang hängt server-only an ADMIN_EMAILS. Der Listener meldet
    // „besitzt nichts", und die Live-Karte zeigte am 02.09.2026 das
    // All-Berlin-Banner über 467 offenen Spots. Der Server hat das letzte Wort.
    expect(resolveUserTier({ uid: UID, owned: new Set(), ...fullSurface })).toBe('allBerlin');
  });

  it('trusts the all-berlin document before the map payload is in', () => {
    // Wer bezahlt hat, soll nicht auf den langsameren Fetch warten müssen.
    expect(resolveUserTier({ uid: UID, owned: new Set(['all-berlin']), ...anonSurface })).toBe(
      'allBerlin'
    );
  });

  it('stays pending while the entitlements are still loading', () => {
    expect(resolveUserTier({ uid: UID, owned: null, ...starterSurface })).toBe('pending');
  });

  it('stays pending while the map payload is still the anonymous one', () => {
    // Listener sagt „nichts", der Server hat über dieses Konto noch nicht
    // gesprochen — ein Admin auf kaltem Cache stünde sonst kurz als 'starter'
    // da, mit Banner.
    expect(resolveUserTier({ uid: UID, owned: new Set(), ...anonSurface })).toBe('pending');
  });

  it('ignores a full-catalog payload that was fetched for another account', () => {
    const stale = { fullCatalog: true, dataUid: 'someone-else', authLoading: false };
    expect(resolveUserTier({ uid: UID, owned: new Set(), ...stale })).toBe('pending');
  });

  it('is starter once both sources agree there is no full pack', () => {
    expect(resolveUserTier({ uid: UID, owned: new Set(['starter']), ...starterSurface })).toBe(
      'starter'
    );
    expect(
      resolveUserTier({ uid: UID, owned: new Set(['category-pizza']), ...starterSurface })
    ).toBe('starter');
  });
});

describe('showsPackPromos', () => {
  it('shows nothing to someone who bought All Berlin', () => {
    expect(showsPackPromos('allBerlin')).toBe(false);
  });

  it('stays quiet while the entitlements are still loading', () => {
    // Der eigentliche Fehler: `pending` fiel vorher auf 'starter' durch, und ein
    // bezahltes Konto sah auf jedem Gerät ohne warmen localStorage-Cache erst
    // einmal die Kaufbanner. Werbung lässt sich später einblenden — nicht
    // zurücknehmen.
    expect(showsPackPromos('pending')).toBe(false);
  });

  it('pitches to guests and to accounts without the full pack', () => {
    expect(showsPackPromos('anon')).toBe(true);
    expect(showsPackPromos('starter')).toBe(true);
  });

  it('answers for every tier there is', () => {
    const all: UserTier[] = ['anon', 'pending', 'starter', 'allBerlin'];
    for (const tier of all) expect(typeof showsPackPromos(tier)).toBe('boolean');
  });
});
