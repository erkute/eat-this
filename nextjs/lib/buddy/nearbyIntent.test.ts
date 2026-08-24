import { describe, expect, it } from 'vitest';
import { isNearbyIntent } from './nearbyIntent';

describe('isNearbyIntent', () => {
  it('detects explicit nearby phrasings', () => {
    expect(isNearbyIntent('Was Gutes in meiner Nähe?')).toBe(true);
    expect(isNearbyIntent("what's good near me right now?")).toBe(true);
    expect(isNearbyIntent('was gibts hier?')).toBe(true);
  });

  it('does not fire on unrelated questions', () => {
    expect(isNearbyIntent('Beste Pizza in Kreuzberg?')).toBe(false);
  });

  it('page-bound: "hier" means the restaurant, not the user location', () => {
    // The restaurant-page chip — must NOT trigger the geolocation gate, which
    // silently swallows the question when the permission prompt is dismissed.
    expect(isNearbyIntent('Was bestell ich hier am besten?', { pageBound: true })).toBe(false);
    // Explicit nearby phrasings still count on a page.
    expect(isNearbyIntent('Was Ähnliches in der Nähe?', { pageBound: true })).toBe(true);
  });
});
