import { describe, expect, it } from 'vitest';
import {
  DETAIL_PEEK_DVH,
  LIST_REST_VISIBLE_DVH,
  resolveSnap,
  snapOffsets,
} from '../phoneSheetSnaps';

const VH = 812;

describe('snapOffsets', () => {
  it('starts both views at zero — the resting stop is the widest map', () => {
    expect(snapOffsets('list', VH)[0]).toBe(0);
    expect(snapOffsets('detail', VH)[0]).toBe(0);
  });

  it('places the list stops at 72 / 50 / 0 dvh of uncovered map', () => {
    // rest is 72dvh of map, so the offsets are how far it shrinks from there.
    expect(snapOffsets('list', VH)).toEqual([0, Math.round(0.22 * VH), Math.round(0.72 * VH)]);
  });

  it('places the detail stops inside its bounded strip', () => {
    expect(snapOffsets('detail', VH)).toEqual([0, Math.round(0.23 * VH), Math.round(0.5 * VH)]);
  });

  it('keeps the strip smaller than the viewport, so it never becomes a full-screen compositor', () => {
    expect(DETAIL_PEEK_DVH).toBeLessThan(100);
    // The list's resting stop must leave the list genuinely peeking in.
    expect(LIST_REST_VISIBLE_DVH).toBe(28);
  });

  it('lands the last stop exactly on the measured sheet top', () => {
    // The whole point: scrolling by the sheet's own document offset puts its
    // top edge — and the handle sitting on it — flush with the viewport top,
    // i.e. under the status bar. A dvh estimate drifts there on iOS.
    const measured = 511;
    expect(snapOffsets('detail', VH, measured).at(-1)).toBe(measured);
    expect(snapOffsets('list', VH, measured).at(-1)).toBe(measured);
  });

  it('keeps the resting stop at zero regardless of the measurement', () => {
    expect(snapOffsets('detail', VH, 511)[0]).toBe(0);
    expect(snapOffsets('list', VH, 733)[0]).toBe(0);
  });

  it('matches the dvh estimate when the measurement agrees with it', () => {
    const estimate = snapOffsets('detail', VH);
    expect(snapOffsets('detail', VH, estimate.at(-1))).toEqual(estimate);
  });

  it('scales with the viewport', () => {
    const small = snapOffsets('list', 600);
    const large = snapOffsets('list', 1000);
    expect(large[2]).toBeGreaterThan(small[2]);
  });
});

describe('resolveSnap', () => {
  const offsets = snapOffsets('list', VH); // [0, 179, 585]

  it('advances one stop on a deliberate short drag', () => {
    // Dragged 60px up from rest — not near stop 2, but clearly intentional.
    expect(resolveSnap(offsets, 60, 0)).toBe(offsets[1]);
  });

  it('goes back a stop when dragged the other way', () => {
    expect(resolveSnap(offsets, offsets[1] - 60, offsets[1])).toBe(offsets[0]);
  });

  it('honours a long drag that crosses more than one stop', () => {
    // From rest all the way past the middle stop — must not stop short at it.
    expect(resolveSnap(offsets, 500, 0)).toBe(offsets[2]);
  });

  it('parks at the nearest stop when the movement was only a wobble', () => {
    expect(resolveSnap(offsets, 8, 0)).toBe(offsets[0]);
    expect(resolveSnap(offsets, offsets[1] + 5, offsets[1])).toBe(offsets[1]);
  });

  it('leaves the scroll alone once the sheet is fully up', () => {
    // Reading down the list: snapping back to a stop would fight the user.
    const deep = offsets[2] + 900;
    expect(resolveSnap(offsets, deep, offsets[2] + 400)).toBe(deep);
  });

  it('never returns an offset outside the defined stops', () => {
    for (const [y, start] of [
      [-200, 0],
      [40, 0],
      [300, 179],
      [584, 585],
    ]) {
      const got = resolveSnap(offsets, y, start);
      expect(offsets).toContain(got);
    }
  });
});
