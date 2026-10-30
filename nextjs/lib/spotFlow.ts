/** Restaurant photo rhythm: keep paragraphs intact. Image-heavy stories
 * collect photos into matching pairs instead of manufacturing text separators.
 * The cover remains separate from the gallery. */

type SpotFlowBlock =
  | { kind: 'text'; text: string; short: boolean }
  | { kind: 'tip' }
  | { kind: 'mustEats' }
  | { kind: 'image'; index: number }
  | { kind: 'imageGroup'; indices: number[] };

/** Ein einzelner Satz unter dieser Länge wirkt zwischen grossen Bildern wie
 *  eine Bildunterschrift — die Seite setzt ihn dann gross in der Markenschrift.
 *  Mehrere Sätze bleiben Lesetext, auch wenn sie kurz sind: gross gesetzt
 *  sahen sie aus wie der Insider-Tipp (Durchsicht 03.10.2026). */
const SHORT_TEXT = 170;

/** Abkürzungen, nach deren Punkt kein Satz endet („Nr. 12", „St. Oberholz"). */
const ABBREVIATIONS = new Set([
  'nr',
  'st',
  'str',
  'dr',
  'ca',
  'bzw',
  'inkl',
  'evtl',
  'vgl',
  'z.b',
  'u.a',
  'mo',
  'di',
  'mi',
  'do',
  'fr',
  'sa',
  'so',
]);

/** Sätze eines Absatzes. Ein Punkt beendet einen Satz nur vor einem
 *  Grossbuchstaben oder einem öffnenden Anführungszeichen, und nie nach einer
 *  Abkürzung. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  const boundary = /([.!?])\s+(?=[A-ZÄÖÜ„"])/g;
  for (let m = boundary.exec(text); m; m = boundary.exec(text)) {
    const before = text.slice(start, m.index);
    const lastWord = before.split(/\s+/).pop()?.toLowerCase() ?? '';
    if (m[1] === '.' && ABBREVIATIONS.has(lastWord)) continue;
    out.push(text.slice(start, m.index + 1).trim());
    start = m.index + m[0].length;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

export function buildSpotFlow({
  paragraphs,
  hasTip,
  hasMustEats,
  imageCount,
  imageSizes = [],
}: {
  /** Die Beschreibung, nach Absätzen (`\n\n`) geteilt. */
  paragraphs: string[];
  hasTip: boolean;
  hasMustEats: boolean;
  /** Fotos der Strecke, ohne das Titelfoto. */
  imageCount: number;
  imageSizes?: ({ width: number; height: number } | null)[];
}): { blocks: SpotFlowBlock[]; rest: number[] } {
  const texts = paragraphs.map(p => p.trim()).filter(Boolean);
  // Der Tipp nach dem ersten Textabschnitt, die Must Eats nach dem zweiten —
  // getrennt, nicht als ein Block (Ansage 03.10.2026).
  const sections: SpotFlowBlock[] = [];
  const asText = (text: string): SpotFlowBlock => ({
    kind: 'text',
    text,
    short: text.length < SHORT_TEXT && splitSentences(text).length === 1,
  });
  if (texts[0]) sections.push(asText(texts[0]));
  if (hasTip) sections.push({ kind: 'tip' });
  if (texts[1]) sections.push(asText(texts[1]));
  if (hasMustEats) sections.push({ kind: 'mustEats' });
  texts.slice(2).forEach((text) => sections.push(asText(text)));

  const words = texts.join(' ').split(/\s+/).filter(Boolean).length;
  if (imageCount >= 2 && words < imageCount * 120) {
    const blocks = [...sections];
    let next = 0;
    while (next < imageCount) {
      const first = imageSizes[next];
      const second = imageSizes[next + 1];
      // Only pair matching native proportions; unknown dimensions stay solo.
      const matches = first && second && first.width > 0 && first.height > 0 &&
        second.width > 0 && second.height > 0 &&
        Math.abs(first.width / first.height - second.width / second.height) < 0.001;
      if (matches) {
        blocks.push({ kind: 'imageGroup', indices: [next, next + 1] });
        next += 2;
      } else {
        blocks.push({ kind: 'image', index: next++ });
      }
    }
    return { blocks, rest: [] };
  }

  const blocks: SpotFlowBlock[] = [];
  let next = 0;
  for (const section of sections) {
    blocks.push(section);
    if (next < imageCount) blocks.push({ kind: 'image', index: next++ });
  }
  const rest = Array.from({ length: imageCount - next }, (_, i) => next + i);
  return { blocks, rest };
}
