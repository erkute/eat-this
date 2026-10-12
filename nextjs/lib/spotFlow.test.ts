import { describe, expect, it } from 'vitest';
import { buildSpotFlow, splitSentences } from './spotFlow';

const build = (paragraphs: string[], imageCount: number, hasTip = false, hasMustEats = false) =>
  buildSpotFlow({ paragraphs, imageCount, hasTip, hasMustEats, imageSizes: Array.from({ length: imageCount }, () => ({ width: 900, height: 1200 })) });

describe('spot photo rhythm', () => {
  it('keeps sentences and abbreviations intact', () => {
    expect(splitSentences('Spaccanapoli Nr. 12 backt im St. Oberholz. Weiter geht es.'))
      .toEqual(['Spaccanapoli Nr. 12 backt im St. Oberholz.', 'Weiter geht es.']);
  });
  it('never splits a paragraph just to separate photos', () => {
    const text = 'Die Karte deckt den Tag ab. Preislich mittel. Noch ein Satz.';
    const { blocks } = build([text], 3, true);
    expect(blocks).toEqual([
      { kind: 'text', text, short: false }, { kind: 'tip' },
      { kind: 'imageGroup', indices: [0, 1] }, { kind: 'image', index: 2 },
    ]);
  });
  it('groups Standard-style photo pairs after the complete story and tip', () => {
    const { blocks } = build(['Einleitung.', 'Speisen und Öffnungszeiten.'], 2, true);
    expect(blocks.map(b => b.kind)).toEqual(['text', 'tip', 'text', 'imageGroup']);
    expect(blocks.at(-1)).toEqual({ kind: 'imageGroup', indices: [0, 1] });
  });
  it('uses pairs, never three images across', () => {
    expect(build(['Kurz.'], 5).blocks.slice(1)).toEqual([
      { kind: 'imageGroup', indices: [0, 1] }, { kind: 'imageGroup', indices: [2, 3] }, { kind: 'image', index: 4 },
    ]);
  });
  it('keeps a different aspect ratio separate without cropping or reordering', () => {
    const { blocks } = buildSpotFlow({ paragraphs: ['Kurz.'], imageCount: 3, hasTip: false, hasMustEats: false,
      imageSizes: [{ width: 900, height: 1200 }, { width: 1200, height: 1600 }, { width: 1600, height: 900 }] });
    expect(blocks.slice(1)).toEqual([{ kind: 'imageGroup', indices: [0, 1] }, { kind: 'image', index: 2 }]);
  });
  it('does not pair images with unknown dimensions', () => {
    const { blocks } = buildSpotFlow({ paragraphs: ['Kurz.'], imageCount: 2, hasTip: false, hasMustEats: false });
    expect(blocks.slice(1)).toEqual([{ kind: 'image', index: 0 }, { kind: 'image', index: 1 }]);
  });
  it('retains individual photos for stories with substantial text', () => {
    const paragraph = 'Ein ausführlicher Absatz mit Inhalt. '.repeat(30);
    expect(build([paragraph, paragraph], 2).blocks.map(b => b.kind))
      .toEqual(['text', 'image', 'text', 'image']);
  });
  it('renders short single sentences large, but keeps several sentences as prose', () => {
    expect(build(['Kurz.', 'Noch ein Satz. Und ein zweiter.'], 0).blocks).toEqual([
      { kind: 'text', text: 'Kurz.', short: true },
      { kind: 'text', text: 'Noch ein Satz. Und ein zweiter.', short: false },
    ]);
  });
  it('preserves every photo exactly once, in order, with or without text and special sections', () => {
    for (let images = 0; images <= 12; images++) for (const text of [[], ['Kurz.'], ['Lang '.repeat(400)]]) {
      for (const tip of [false, true]) for (const mustEats of [false, true]) {
        const { blocks, rest } = build(text, images, tip, mustEats);
        const indices = blocks.flatMap(b => b.kind === 'image' ? [b.index] : b.kind === 'imageGroup' ? b.indices : []);
        expect([...indices, ...rest]).toEqual(Array.from({ length: images }, (_, i) => i));
        expect(blocks.filter(b => b.kind === 'tip')).toHaveLength(Number(tip));
        expect(blocks.filter(b => b.kind === 'mustEats')).toHaveLength(Number(mustEats));
      }
    }
  });
});
