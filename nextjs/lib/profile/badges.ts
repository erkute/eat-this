/**
 * Abzeichen — was das Deck über den Stand hinaus hergibt.
 *
 * KEINE RANGLISTE, und das ist eine Produktentscheidung, keine
 * Bequemlichkeit: Eat This nennt seine Spot-Zahlen bewusst nicht, und bei
 * einer Sammlung ist „du bist Letzter" die falsche Nachricht. Ein Abzeichen
 * misst gegen die Sammlung, nicht gegen andere Leute.
 *
 * Alles hier rechnet sich aus dem Album aus, das die Profilseite ohnehin
 * baut (`buildAlbum`) — kein Firestore-Feld, kein Backend, nichts, was
 * nachgehalten werden müsste. Ein Abzeichen ist damit auch nie veraltet.
 */

interface BadgeInput {
  /** Wie viele Karten aufgedeckt sind. */
  collected: number;
  /** Die Bezirke des Albums mit ihrem Stand. */
  groups: { group: string; done: number; total: number }[];
}

export type Badge =
  /** Die höchste erreichte Stufe — nicht alle darunter. „Erste Karte" neben
   *  „25 Karten" liest sich wie eine Liste von Selbstverständlichkeiten. */
  { kind: 'cards'; value: number } | { kind: 'district'; value: string } | { kind: 'allBerlin' };

/* Die Stufen. Die erste ist die wichtigste: sie kommt in dem Moment, in dem
   jemand zum ersten Mal vor einem Spot stand und die Karte umgedreht hat. */
const CARD_TIERS = [100, 50, 25, 10, 1] as const;

/**
 * Was dieses Deck verdient hat — nur Erreichtes, in fester Reihenfolge:
 * erst die Stufe, dann die vollen Bezirke, dann ganz Berlin.
 *
 * Nichts Verschlossenes: eine Reihe ausgegrauter Abzeichen ist eine Liste
 * dessen, was einem fehlt, und die steht auf dieser Seite schon zweimal
 * (Reiter „Fehlende", die leeren Plätze im Raster).
 */
export function computeBadges({ collected, groups }: BadgeInput): Badge[] {
  const badges: Badge[] = [];

  const tier = CARD_TIERS.find((t) => collected >= t);
  if (tier) badges.push({ kind: 'cards', value: tier });

  /* Ein Bezirk mit null Plätzen ist nicht „komplett", sondern leer. */
  const full = groups.filter((g) => g.total > 0 && g.done === g.total);
  for (const group of full) badges.push({ kind: 'district', value: group.group });

  /* Nur wenn es überhaupt mehrere Bezirke gibt — sonst sagte „Ganz Berlin"
     dasselbe wie das eine Bezirks-Abzeichen daneben. */
  if (groups.length > 1 && full.length === groups.length) badges.push({ kind: 'allBerlin' });

  return badges;
}
