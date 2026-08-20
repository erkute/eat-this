/**
 * Providence Sans draws a capital "I" as a bare vertical stroke. Blown up to a
 * 4em `::first-letter` drop cap in brand red it stops reading as a letter and
 * reads as a rendering artifact — the lede then looks like it starts mid-word
 * ("m zweiten Hof der Sophienhöfe …"). German ledes open with "Im" / "In" /
 * "Ist" constantly, so this is not a rare edge case.
 *
 * Swapping the face for just those letters would make that page's cap look
 * unrelated to every other page's, so the cap is dropped instead — the standard
 * typographic answer to an initial that has no shape to show off. The styling
 * stays on `::first-letter`; it must NOT become a <span> (screen readers
 * announce the split letter as its own word and it breaks selection across the
 * first character — see the note in components/map/RestaurantDetail.tsx).
 */
const AMBIGUOUS_DROP_CAPS = new Set(['I', 'l']);

/** True when `text` starts with a letter that makes a meaningless drop cap. */
export function hasAmbiguousDropCap(text: string | null | undefined): boolean {
  if (!text) return false;
  // ::first-letter swallows any leading punctuation (quotes, brackets) along
  // with the letter itself, so skip past it the same way the browser does.
  for (const char of text.trim()) {
    if (/[\p{L}\p{N}]/u.test(char)) return AMBIGUOUS_DROP_CAPS.has(char);
  }
  return false;
}

/**
 * A 4em cap needs three lines of text to wrap around it. Short ledes ("Bar on
 * Friedelstraße, Neukölln.") don't have them, so the float bleeds into the next
 * paragraph and indents it — it reads as a layout bug, not as typography.
 */
const MIN_LEDE_CHARS_FOR_DROP_CAP = 90;

/** True when the lede should render without a drop cap. */
export function shouldSkipDropCap(text: string | null | undefined): boolean {
  if (!text) return true;
  return hasAmbiguousDropCap(text) || text.trim().length < MIN_LEDE_CHARS_FOR_DROP_CAP;
}
