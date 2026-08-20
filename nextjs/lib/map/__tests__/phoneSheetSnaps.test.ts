import { describe, expect, it } from 'vitest';
import {
  DETAIL_PEEK_DVH,
  LIST_REST_VISIBLE_DVH,
  resolveSnap,
  resolveToggleMode,
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

describe('resolveToggleMode', () => {
  const offsets = snapOffsets('list', VH);
  const sheetStop = offsets[offsets.length - 1];

  it('offers the way back to the map once the map is covered', () => {
    expect(resolveToggleMode(offsets, sheetStop, false)).toBe('toMap');
    // The whole point of the pill: deep in a long list.
    expect(resolveToggleMode(offsets, sheetStop + 4000, false)).toBe('toMap');
  });

  it('offers the way back to the list across the map half — but only with a place to return to', () => {
    expect(resolveToggleMode(offsets, 0, true)).toBe('toList');
    expect(resolveToggleMode(offsets, 0, false)).toBe(null);
    /* Bounded by the MIDDLE stop, not the top one: keyed to the map stop, a
       24px nudge made the pill vanish — it read as flinching from the finger. */
    expect(resolveToggleMode(offsets, offsets[1], true)).toBe('toList');
  });

  it('stays out of the way in between, where the map is half on screen anyway', () => {
    const between = Math.round((offsets[1] + sheetStop) / 2);
    expect(resolveToggleMode(offsets, between, true)).toBe(null);
    expect(resolveToggleMode(offsets, between, false)).toBe(null);
  });

  it('tolerates the few px an iOS rubber-band scroll lands off a stop', () => {
    expect(resolveToggleMode(offsets, -12, true)).toBe('toList');
    expect(resolveToggleMode(offsets, sheetStop - 12, false)).toBe('toMap');
  });
});
