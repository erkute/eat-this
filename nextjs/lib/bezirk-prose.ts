type Loc = 'de' | 'en';

/** Die Abschnittstitel der Bezirksseite. */

/** H2 über der kuratierten Bestenliste (`bezirk.topSpots`). */
export function buildBezirkBestOfHeading(name: string, locale: Loc): string {
  return locale === 'de' ? `Die besten Spots in ${name}` : `The best spots in ${name}`;
}

/**
 * H2 über dem Rest der Liste, unter der Bestenliste. Bewusst ohne Zahl und ohne
 * „A–Z": beides beschrieb die Mechanik statt den Inhalt, und die Zahl stand
 * ohnehin schon in der Liste darunter. Nur gerendert, wenn es tatsächlich eine
 * Bestenliste darüber gibt.
 */
export function buildBezirkDirectoryHeading(locale: Loc): string {
  return locale === 'de' ? 'Weitere Spots' : 'More spots';
}
