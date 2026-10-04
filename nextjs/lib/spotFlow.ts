/**
 * Die Bildfolge der Spot-Seite (Heftlook nach 032c, Wahl 03.10.2026): die
 * Fotos stehen spaltenbreit zwischen dem Text, und **nie zwei direkt
 * hintereinander**. Vor jedem Bild steht ein Abschnitt — eine Satzgruppe der
 * Beschreibung, der Insider-Tipp oder die Must Eats. Reicht der Text nicht für
 * alle Fotos, wird er in Sätze geteilt; bleiben danach Fotos übrig, stehen sie
 * als Reihe am Ende der Strecke (`rest`) statt gestapelt.
 *
 * Das Titelfoto gehört nicht dazu — es steht immer vorne, direkt unter dem
 * Vorspann.
 */

export type SpotFlowBlock =
  | { kind: 'text'; text: string; short: boolean }
  | { kind: 'tip' }
  | { kind: 'mustEats' }
  | { kind: 'image'; index: number };

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

/** `n` Gruppen aufeinanderfolgender Sätze, möglichst gleich lang. */
function groupSentences(sentences: string[], n: number): string[] {
  const total = sentences.reduce((sum, s) => sum + s.length, 0);
  const groups: string[] = [];
  let current: string[] = [];
  let length = 0;
  sentences.forEach((sentence, i) => {
    current.push(sentence);
    length += sentence.length;
    const groupsLeft = n - groups.length - 1;
    const sentencesLeft = sentences.length - i - 1;
    const reachedShare = length >= (total / n) * (groups.length + 1);
    if (groupsLeft > 0 && (reachedShare || sentencesLeft === groupsLeft)) {
      groups.push(current.join(' '));
      current = [];
    }
  });
  if (current.length) groups.push(current.join(' '));
  return groups;
}

export function buildSpotFlow({
  paragraphs,
  hasTip,
  hasMustEats,
  imageCount,
}: {
  /** Die Beschreibung, nach Absätzen (`\n\n`) geteilt. */
  paragraphs: string[];
  hasTip: boolean;
  hasMustEats: boolean;
  /** Fotos der Strecke, ohne das Titelfoto. */
  imageCount: number;
}): { blocks: SpotFlowBlock[]; rest: number[] } {
  let texts = paragraphs.map((p) => p.trim()).filter(Boolean);
  // Jedes Foto braucht einen Abschnitt davor; Tipp und Must Eats sind welche.
  const needed = Math.max(1, imageCount - Number(hasTip) - Number(hasMustEats));
  if (texts.length > 0 && texts.length < needed) {
    const sentences = texts.flatMap(splitSentences);
    texts = groupSentences(sentences, Math.min(needed, sentences.length));
  }

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

  const blocks: SpotFlowBlock[] = [];
  let next = 0;
  for (const section of sections) {
    blocks.push(section);
    if (next < imageCount) blocks.push({ kind: 'image', index: next++ });
  }
  const rest = Array.from({ length: imageCount - next }, (_, i) => next + i);
  return { blocks, rest };
}
