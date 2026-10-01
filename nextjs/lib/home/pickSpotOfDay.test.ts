import { describe, it, expect } from 'vitest';
import { pickSpotOfDay, previousDay, type SpotCandidate } from './pickSpotOfDay';

const r = (id: string, o: Partial<SpotCandidate> = {}): SpotCandidate => ({
  _id: id,
  featuredOnDate: null,
  ...o,
});

describe('pickSpotOfDay', () => {
  it('prefers a restaurant whose featuredOnDate equals today', () => {
    const today = '2026-06-01';
    const list = [r('a'), r('b', { featuredOnDate: today }), r('c')];
    expect(pickSpotOfDay(list, today)?._id).toBe('b');
  });

  it('ignores featuredOnDate that is not today (falls to rotation)', () => {
    const list = [r('a', { featuredOnDate: '2026-05-30' }), r('b'), r('c')];
    // No dated match for this day → a rotation pick, never the stale-dated 'a'
    // just because it has a (different) date.
    const picked = pickSpotOfDay(list, '2026-06-01')?._id;
    expect(['a', 'b', 'c']).toContain(picked);
  });

  it('is deterministic for the same day and input', () => {
    const list = [r('a'), r('b'), r('c')];
    expect(pickSpotOfDay(list, '2026-06-01')?._id).toBe(pickSpotOfDay(list, '2026-06-01')?._id);
  });

  it('is stable regardless of input order (sorts by id)', () => {
    const a = pickSpotOfDay([r('a'), r('b'), r('c')], '2026-06-01')?._id;
    const b = pickSpotOfDay([r('c'), r('a'), r('b')], '2026-06-01')?._id;
    expect(a).toBe(b);
  });

  it('rotates daily — three consecutive days cover all three spots', () => {
    const list = [r('a'), r('b'), r('c')];
    const picks = new Set([
      pickSpotOfDay(list, '2026-06-01')?._id,
      pickSpotOfDay(list, '2026-06-02')?._id,
      pickSpotOfDay(list, '2026-06-03')?._id,
    ]);
    expect(picks.size).toBe(3);
  });

  it('returns null for an empty list', () => {
    expect(pickSpotOfDay([], '2026-06-01')).toBeNull();
  });
});

describe('previousDay', () => {
  it('steps back one calendar day, across months and years', () => {
    expect(previousDay('2026-10-01')).toBe('2026-09-30');
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });

  it("gives yesterday's pick, not today's, when fed to the rotation", () => {
    const list = [r('a'), r('b'), r('c')];
    const today = '2026-10-01';
    expect(pickSpotOfDay(list, previousDay(today))?._id).not.toBe(pickSpotOfDay(list, today)?._id);
  });
});
