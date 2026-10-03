import { describe, expect, it } from 'vitest';
import {
  COVER_HEIGHT,
  CUTOUT_LOOKS,
  FRONT_LOGO,
  PHOTO_LOOKS,
  altTone,
  coverLook,
  cutoutRect,
  fitCutout,
  fitSize,
  focusPoint,
  frontGeometry,
  isDish,
  plateTone,
  scaleSizes,
  splitHeadline,
  toneOnTone,
  usableCutout,
  type CutoutCover,
} from './magazineCover';

const cut = (box: CutoutCover['box'], w = 1600, h = 2133): CutoutCover => ({
  dish: true,
  cutout: 'https://cdn.sanity.io/images/p/d/cut.png',
  cutoutWidth: w,
  cutoutHeight: h,
  box,
});
const dish = cut({ x: 0.1, y: 0.3, w: 0.5, h: 0.4 });

describe('coverLook', () => {
  it('runs every photo through the ten photo looks, so neighbours never match', () => {
    const looks = Array.from({ length: 10 }, (_, i) => coverLook(i + 1, null));
    expect(new Set(looks).size).toBe(10);
    for (const look of looks) expect(PHOTO_LOOKS).toContain(look);
  });

  it('gives every dish a cut-out look and a photo without one a photo look', () => {
    expect(CUTOUT_LOOKS).toContain(coverLook(24, dish));
    expect(CUTOUT_LOOKS).toContain(coverLook(23, dish));
    expect(PHOTO_LOOKS).toContain(coverLook(23, { ...dish, dish: false }));
  });

  it('runs dishes through all five cut-out looks, so neighbours never match', () => {
    const looks = [1, 2, 3, 4, 5].map((n) => coverLook(n, dish));
    expect(new Set(looks)).toEqual(new Set(CUTOUT_LOOKS));
  });

  it('never gives a cut-out look without a cut-out', () => {
    expect(PHOTO_LOOKS).toContain(coverLook(24, { dish: true }));
    expect(PHOTO_LOOKS).toContain(coverLook(24, { look: 'still' }));
  });

  it('follows the look chosen in Studio', () => {
    expect(coverLook(24, { ...dish, look: 'purple' })).toBe('purple');
    expect(coverLook(23, { ...dish, dish: false, look: 'front' })).toBe('front');
    expect(coverLook(23, { look: 'face' })).toBe('face');
  });
});

describe('tones', () => {
  it('changes colour when a look comes round again ten issues later', () => {
    expect(altTone(5, ['yellow', 'red'])).not.toBe(altTone(15, ['yellow', 'red']));
    expect(plateTone(8)).not.toBe(plateTone(18));
  });

  it('tints the LOVE logo darker on a light photo and lighter on a dark one', () => {
    const palette = { dark: '#645454', light: '#c4bcb8' };
    expect(toneOnTone({ ...palette, dominant: { foreground: '#000' } })).toBe('#645454');
    expect(toneOnTone({ ...palette, dominant: { foreground: '#fff' } })).toBe('#c4bcb8');
    expect(toneOnTone(null)).toMatch(/^#/);
  });
});

describe('headlines', () => {
  it('splits at the colon or the dash', () => {
    expect(splitHeadline('Burger in Berlin: 6 Buden für verschiedene Lebenslagen')).toEqual([
      'Burger in Berlin',
      '6 Buden für verschiedene Lebenslagen',
    ]);
    expect(splitHeadline('Die besten Bäckereien in Berlin – und was du dort bestellst')).toEqual([
      'Die besten Bäckereien in Berlin',
      'und was du dort bestellst',
    ]);
    expect(splitHeadline('Weinbars')).toEqual(['Weinbars', '']);
  });

  it('sizes long headlines down, short ones up, within the bounds', () => {
    const long = 'Essen und Trinken in Schöneberg – 9 Adressen von acht Uhr morgens bis vier Uhr nachts';
    expect(fitSize(long, 352, 3.6, 5.4)).toBe(4.1);
    expect(fitSize('Kurz', 352, 3.6, 5.4)).toBe(5.4);
    expect(fitSize('x'.repeat(500), 352, 3.6, 5.4)).toBe(3.6);
  });
});

describe('geometry', () => {
  it('fits a cut-out into its box, centred on the given point', () => {
    const r = fitCutout(cut({ x: 0.3, y: 0.3, w: 0.36, h: 0.37 }, 1600, 1710), 84, 62, 50, 76);
    expect(r.width).toBeLessThanOrEqual(84);
    expect(r.height).toBeLessThanOrEqual(62.01);
    expect(r.left + r.width / 2).toBeCloseTo(50);
    expect(r.top + r.height / 2).toBeCloseTo(76);
  });

  it('lets a dish overlap the lower half of the logo on its own photo', () => {
    const g = frontGeometry(cut({ x: 0.12, y: 0.24, w: 0.78, h: 0.59 }));
    expect(g.mode).toBe('photo');
    const aspect = 2133 / 1600;
    expect(g.rect.left).toBeLessThanOrEqual(0);
    expect(g.rect.top).toBeLessThanOrEqual(0);
    expect(g.rect.left + g.rect.width).toBeGreaterThanOrEqual(100);
    expect(g.rect.top + g.rect.width * aspect).toBeGreaterThanOrEqual(COVER_HEIGHT);
    const dishTop = g.rect.top + 0.24 * aspect * g.rect.width;
    expect(dishTop).toBeGreaterThan(FRONT_LOGO.top);
    expect(dishTop).toBeLessThan(FRONT_LOGO.top + FRONT_LOGO.height);
  });

  it('cuts the dish out onto ink when it touches the top of its photo', () => {
    expect(frontGeometry(cut({ x: 0, y: 0, w: 0.98, h: 1 })).mode).toBe('flat');
  });

  it('crops the cut-out to the box in asset pixels', () => {
    expect(cutoutRect(cut({ x: 0.12, y: 0.24, w: 0.78, h: 0.59 }))).toBe('192,511,1248,1259');
  });

  it('zooms onto the dish, or into the middle without one', () => {
    expect(focusPoint(cut({ x: 0.2, y: 0.4, w: 0.2, h: 0.2 }))).toEqual({ x: 30, y: 50 });
    expect(focusPoint(null)).toEqual({ x: 50, y: 50 });
  });
});

it('scales every length in a sizes list', () => {
  expect(scaleSizes('(max-width: 767.98px) 80vw, 420px', 0.5)).toBe(
    '(max-width: 767.98px) calc(80vw * 0.5), calc(420px * 0.5)'
  );
});

describe('cut-out reports', () => {
  const report = { found: true, instances: 1, box: { x: 0.3, y: 0.3, w: 0.4, h: 0.4 }, edges: 0 };

  it('calls food with a free-standing subject a dish', () => {
    expect(isDish({ ...report, labels: { food: 0.53 } })).toBe(true);
  });

  it('rejects shelves and racks that run off the picture', () => {
    expect(isDish({ ...report, edges: 3, labels: { food: 0.53 } })).toBe(false);
  });

  it('keeps a subject that falls apart into many pieces out entirely', () => {
    expect(usableCutout({ ...report, instances: 7 })).toBe(false);
  });

  it('keeps flowers and wine as cut-outs, but not as dishes', () => {
    const vase = { ...report, labels: { vase: 0.79 } };
    expect(usableCutout(vase)).toBe(true);
    expect(isDish(vase)).toBe(false);
  });
});
