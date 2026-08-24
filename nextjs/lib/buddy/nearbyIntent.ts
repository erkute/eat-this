const NEARBY_INTENT_RE =
  /\b(?:in meiner nähe|in der nähe|naehe|nähe|near me|nearby|around me|um mich herum|hier)\b/i;

// On a restaurant page "hier"/"here" means THAT spot ("was bestell ich hier?"),
// not the user's location — asking for geolocation there would be wrong twice:
// wrong question, and it silently swallows the message when the permission
// prompt is dismissed. Explicit nearby phrasings still count.
const NEARBY_INTENT_PAGE_BOUND_RE =
  /\b(?:in meiner nähe|in der nähe|naehe|nähe|near me|nearby|around me|um mich herum)\b/i;

export function isNearbyIntent(text: string, opts: { pageBound?: boolean } = {}): boolean {
  return (opts.pageBound ? NEARBY_INTENT_PAGE_BOUND_RE : NEARBY_INTENT_RE).test(text);
}
