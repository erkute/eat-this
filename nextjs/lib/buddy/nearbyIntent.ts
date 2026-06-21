const NEARBY_INTENT_RE = /\b(?:in meiner nähe|in der nähe|naehe|nähe|near me|nearby|around me|um mich herum|hier)\b/i

export function isNearbyIntent(text: string): boolean {
  return NEARBY_INTENT_RE.test(text)
}
