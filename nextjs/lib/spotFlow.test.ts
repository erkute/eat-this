import { describe, expect, it } from 'vitest';
import { buildSpotFlow, splitSentences, type SpotFlowBlock } from './spotFlow';

const kinds = (blocks: SpotFlowBlock[]) =>
  blocks.map((b) => (b.kind === 'image' ? `img${b.index}` : b.kind));

/** Nie zwei Bilder direkt hintereinander (Ansage 03.10.2026). */
const noImagePairs = (blocks: SpotFlowBlock[]) =>
  blocks.every((b, i) => !(b.kind === 'image' && blocks[i + 1]?.kind === 'image'));

describe('splitSentences', () => {
  it('splits after a full stop before a capital', () => {
    expect(splitSentences('Erst das. Dann das! Und? Ja.')).toEqual([
      'Erst das.',
      'Dann das!',
      'Und?',
      'Ja.',
    ]);
  });

  it('keeps abbreviations and numbers inside the sentence', () => {
    expect(splitSentences('Spaccanapoli Nr. 12 backt im St. Oberholz. Weiter geht es.')).toEqual([
      'Spaccanapoli Nr. 12 backt im St. Oberholz.',
      'Weiter geht es.',
    ]);
  });
});

describe('buildSpotFlow', () => {
  it('places every photo between text, tip and Must Eats when there is enough to say', () => {
    const { blocks, rest } = buildSpotFlow({
      paragraphs: ['Erster Absatz. Mit zwei Sätzen.', 'Zweiter Absatz. Auch mit zweien.'],
      hasTip: true,
      hasMustEats: true,
      imageCount: 4,
    });
    expect(kinds(blocks)).toEqual([
      'text',
      'img0',
      'tip',
      'img1',
      'text',
      'img2',
      'mustEats',
      'img3',
    ]);
    expect(rest).toEqual([]);
  });

  it('splits a short description into sentences so each photo still gets text before it', () => {
    const { blocks, rest } = buildSpotFlow({
      paragraphs: ['POLIN in Steglitz.', 'Die Karte deckt den Tag ab. Preislich mittel.'],
      hasTip: false,
      hasMustEats: false,
      imageCount: 3,
    });
    expect(kinds(blocks)).toEqual(['text', 'img0', 'text', 'img1', 'text', 'img2']);
    expect(rest).toEqual([]);
  });

  it('marks short text so it can stand large instead of reading like a caption', () => {
    const { blocks } = buildSpotFlow({
      paragraphs: ['Kurz.', 'x'.repeat(240) + '.'],
      hasTip: false,
      hasMustEats: false,
      imageCount: 0,
    });
    expect(blocks).toEqual([
      { kind: 'text', text: 'Kurz.', short: true },
      { kind: 'text', text: 'x'.repeat(240) + '.', short: false },
    ]);
  });

  it('sends photos beyond the text to a row at the end instead of stacking them', () => {
    const { blocks, rest } = buildSpotFlow({
      paragraphs: ['Ein einziger Satz.'],
      hasTip: false,
      hasMustEats: false,
      imageCount: 5,
    });
    expect(kinds(blocks)).toEqual(['text', 'img0']);
    expect(rest).toEqual([1, 2, 3, 4]);
  });

  it('works with a tip but no description', () => {
    const { blocks, rest } = buildSpotFlow({
      paragraphs: [],
      hasTip: true,
      hasMustEats: false,
      imageCount: 2,
    });
    expect(kinds(blocks)).toEqual(['tip', 'img0']);
    expect(rest).toEqual([1]);
  });

  it('keeps long paragraphs whole', () => {
    const long = 'Satz eins ist da. Satz zwei auch. Satz drei kommt.';
    const { blocks } = buildSpotFlow({
      paragraphs: [long],
      hasTip: false,
      hasMustEats: false,
      imageCount: 1,
    });
    expect(blocks[0]).toEqual({ kind: 'text', text: long, short: true });
  });

  it('never puts two photos next to each other', () => {
    for (let images = 0; images <= 8; images++) {
      for (const paragraphs of [[], ['Eins.'], ['Eins. Zwei. Drei.'], ['A. B.', 'C. D. E.']]) {
        for (const hasTip of [false, true]) {
          for (const hasMustEats of [false, true]) {
            const { blocks, rest } = buildSpotFlow({
              paragraphs,
              hasTip,
              hasMustEats,
              imageCount: images,
            });
            expect(noImagePairs(blocks)).toBe(true);
            expect(blocks.filter((b) => b.kind === 'image').length + rest.length).toBe(images);
          }
        }
      }
    }
  });
});
