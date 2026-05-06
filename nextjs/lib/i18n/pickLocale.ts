/**
 * Locale resolution for content types where DE is the base language and EN
 * is an optional override (Restaurant, Bezirk).
 *
 * News + StaticPages use the inverted convention (base=EN, *De=override) and
 * resolve via inline `locale === 'de' ? x.titleDe || x.title : x.title` —
 * see `app/[locale]/(spa)/news/[slug]/page.tsx`. Don't try to share this
 * helper across both conventions.
 */
export function pickLocale(
  base: string | undefined,
  override: string | null | undefined,
  locale: 'de' | 'en',
): string | undefined {
  if (locale === 'en' && typeof override === 'string' && override.length > 0) {
    return override
  }
  return base
}

/**
 * True when a Restaurant or Bezirk doc has been translated to EN. We key off
 * the primary prose field (descriptionEn). Partial coverage (e.g. tip
 * translated but description missing) doesn't justify exposing the EN URL —
 * consumers should fall back to deOnly + DE canonical in that case.
 */
export function hasEnContent(doc: { descriptionEn?: string | null }): boolean {
  return typeof doc.descriptionEn === 'string' && doc.descriptionEn.trim().length > 0
}
