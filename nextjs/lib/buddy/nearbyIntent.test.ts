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
});
