import { describe, it, expect } from 'vitest';
import { showsPackPromos, type UserTier } from '../useUserTier';

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
