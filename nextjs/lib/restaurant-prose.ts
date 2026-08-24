import type { OpeningHourSlot } from './types';
import { isClosedSlot, localizeOpeningDays, localizeOpeningHours } from '@/lib/map/openingHours';

type Loc = 'de' | 'en';

/**
 * Auto-generated prose blocks that live on the restaurant detail page.
 *
 * The point isn't editorial polish — it's surfacing entity facts as
 * natural language so restaurant pages clear Google's "thin content"
 * bar (target: ~200+ unique words per page) and qualify for indexing.
 * Every helper degrades gracefully when source fields are missing.
 */

/**
 * Concise multi-slot opening-hours summary, comma-separated. Null when empty.
 *
 * Trägt seit dem Wegfall der FAQ den Kurzstreifen unter dem Hero: dort ist die
 * Zeile die Antwort auf „wann offen", bevor der ausführliche Fakten-Block
 * überhaupt in Sicht kommt. Lokalisiert, sonst stünde dort für deutsche Leser
 * "Mon-Tue closed, Wed-Fri 17:00-21:00".
 *
 * Rest days move to the end and share one "geschlossen", because the caller
 * leads with "Geöffnet" and slot order is the editor's, not the reader's:
 * "Geöffnet Mo–Di geschlossen, Mi–Sa 18:00-23:00" opens by announcing when the
 * place is shut. Now: "Geöffnet Mi–Sa 18:00-23:00, Mo–Di und So geschlossen".
 */
export function summarizeHours(
  slots: OpeningHourSlot[] | undefined,
  locale: Loc = 'de'
): string | null {
  if (!slots || slots.length === 0) return null;

  const open: string[] = [];
  const closedDays: string[] = [];
  for (const slot of slots) {
    const days = localizeOpeningDays(slot.days, locale).trim();
    if (isClosedSlot(slot.hours)) {
      if (days) closedDays.push(days);
      continue;
    }
    const entry = `${days} ${localizeOpeningHours(slot.hours, locale)}`.trim();
    if (entry) open.push(entry);
  }

  const parts = [...open];
  if (closedDays.length > 0) {
    parts.push(`${joinDays(closedDays, locale)} ${locale === 'de' ? 'geschlossen' : 'closed'}`);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

/** "Mo", "Mo–Di und So", "Mo, Mi und So" — Oxford-less, matching German usage. */
function joinDays(days: string[], locale: Loc): string {
  if (days.length === 1) return days[0];
  const conjunction = locale === 'de' ? 'und' : 'and';
  return `${days.slice(0, -1).join(', ')} ${conjunction} ${days[days.length - 1]}`;
}

export interface FAQEntry {
  question: string;
  answer: string;
}

/**
 * Magazine-style split of the long description into editorial pieces.
 * Preserves the author's paragraph breaks (`\n\n`) so rhythm survives —
 * the previous flat-string body was visually compressing multi-paragraph
 * descriptions into a single wall of text.
 *
 *   - `lede`  — first sentence of the first paragraph, rendered as
 *               display-sized pull-quote *intro*.
 *   - `paragraphsBefore` — body paragraphs that come before the midQuote
 *                          (or all body paragraphs when no midQuote fires).
 *   - `midQuote` — first sentence of the middle paragraph, pulled out as
 *                  a block-quote between paragraphs. Only emitted when the
 *                  body has ≥3 paragraphs AND that sentence is quotable
 *                  (60–220 chars). Short bodies skip the quote entirely.
 *   - `paragraphsAfter`  — body paragraphs after the midQuote.
 *
 * No editorial Sanity field is involved: this is pure presentation.
 */
interface MagazineDescription {
  lede: string;
  paragraphsBefore: string[];
  midQuote: string | null;
  paragraphsAfter: string[];
}

export function splitDescriptionForMagazine(
  description: string | undefined
): MagazineDescription | null {
  const text = (description ?? '').trim();
  if (!text) return null;

  // Split source into paragraphs on 2+ consecutive newlines. Single \n is
  // treated as a soft break inside a paragraph (standard prose convention).
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;

  // Lede = first sentence of paragraph 1. The remainder of paragraph 1 (if
  // any) becomes the leading body paragraph.
  const firstPara = paragraphs[0]!;
  const ledeMatch = firstPara.match(/^([\s\S]+?[.!?])\s+([\s\S]+)$/);
  let lede: string;
  let firstParaRest = '';
  if (ledeMatch) {
    lede = ledeMatch[1]!.trim();
    firstParaRest = ledeMatch[2]!.trim();
  } else {
    lede = firstPara;
  }

  const bodyParagraphs: string[] = [];
  if (firstParaRest) bodyParagraphs.push(firstParaRest);
  for (let i = 1; i < paragraphs.length; i++) bodyParagraphs.push(paragraphs[i]!);

  // Mid-page pull-quote: only fires when the body has ≥3 paragraphs AND the
  // first sentence of the middle paragraph is quotable (60-220 chars). For
  // shorter bodies we keep the rhythm clean — just paragraphs, no quote.
  let midQuote: string | null = null;
  let paragraphsBefore: string[] = bodyParagraphs;
  let paragraphsAfter: string[] = [];

  if (bodyParagraphs.length >= 3) {
    const midIdx = Math.floor(bodyParagraphs.length / 2);
    const midPara = bodyParagraphs[midIdx]!;
    const midSentences = splitSentences(midPara);
    const firstMid = midSentences[0]?.trim() ?? '';
    if (firstMid.length >= 60 && firstMid.length <= 220) {
      midQuote = firstMid;
      const midRest = midSentences.slice(1).join(' ').trim();
      paragraphsBefore = bodyParagraphs.slice(0, midIdx);
      paragraphsAfter = [...(midRest ? [midRest] : []), ...bodyParagraphs.slice(midIdx + 1)];
    }
  }

  return { lede, paragraphsBefore, midQuote, paragraphsAfter };
}

// Sentence splitter that doesn't get fooled by abbreviations like "z.B."
// or "i.e." — keeps trailing whitespace + punctuation with each sentence.
function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/);
  return parts.map((p) => p.trim()).filter(Boolean);
}
