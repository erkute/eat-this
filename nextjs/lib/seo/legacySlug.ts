import { normalizeName } from '../normalizeName'

// Reconstructed slug algorithm of the *pre-rebuild* site.
//
// The old builder transliterated German umlauts (ä→ae, ö→oe, ü→ue, ß→ss) and
// the Turkish/Polish set (via normalizeName), but every *other* diacritic
// (é, ô, ō, â, ā …) and apostrophes were simply treated as a word break —
// NOT transliterated. So "AKKURAT Café" → "akkurat-caf", "La Côte" → "la-c-te",
// "893 Ryōtei" → "893-ry-tei", "Smash'd Eatery" → "smash-d-eatery".
//
// The new builder transliterates those too (é→e …), which changed the slug of
// every accented spot — and Google's index still points at the old ones, so
// they 404. `oldStyleSlug` lets us regenerate the old slug from the current
// name and map it back. See [[project-rebuild-slug-404-incident]].
const UMLAUTS: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'ae', Ö: 'oe', Ü: 'ue', ß: 'ss',
}

export function oldStyleSlug(name: string): string {
  return normalizeName(name)
    .replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c] ?? c)
    .toLowerCase()
    // Anything left that isn't a-z/0-9 — remaining diacritics, apostrophes,
    // spaces, punctuation — becomes a separator (the old builder's behaviour).
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
