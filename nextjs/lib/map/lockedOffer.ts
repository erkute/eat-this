/**
 * Welches Angebot ein gesperrter Spot macht — die ganze Regel an einem Ort.
 *
 * Sie lag vorher in drei Dateien verteilt: `uid !== null && dataUid === uid` in
 * MapSection, `claimingSlug === slug` in MapSectionBody, und die Oder-Kette in
 * LockedDetail. Genau deshalb konnte derselbe Fehler dreimal auftreten, ohne
 * dass ich ihn beim Lesen fand: es gab keine Stelle, an der die Bedingung
 * vollständig dastand, und keinen Test, der die Zustandsfolge einer Anmeldung
 * durchspielt. Beides gibt es jetzt — siehe lockedOffer.test.ts, das den
 * Rücksprung aus der Login-Mail Schritt für Schritt abgeht.
 *
 * Der Grundsatz: **Ein Preis wird erst gezeigt, wenn feststeht, dass dieser
 * Spot Geld kostet.** Solange das offen ist, gilt der Signup-Zweig. Der ist nie
 * falsch — schlimmstenfalls bietet er für die Dauer eines Refetch ein Konto an
 * jemanden an, der schon eins hat. Umgekehrt ist es ein Preisschild auf einem
 * Spot, den die nächste Antwort verschenkt.
 */
export interface LockedOfferFacts {
  /** Angemeldet? Kommt Hunderte Millisekunden vor `mapUid` an. */
  uid: string | null;
  /** Für WEN die Kartendaten in der Hand geholt wurden. `null` = anonyme Sicht. */
  mapUid: string | null;
  /** Slug, dessen Claim gerade läuft (aus der Continue-URL), sonst `null`. */
  claimingSlug: string | null;
  /** Slug des Spots, um den es in diesem Sheet geht. */
  slug: string;
}

/**
 * Drei Zustände, keine zwei:
 *
 *   signup   → die Anmeldung ist die nächste Sprosse
 *   claiming → sie läuft gerade für GENAU diesen Spot; er geht gleich auf oder
 *              wird begründet abgelehnt. Das Sheet zeigt dieselbe Fläche wie
 *              bei `signup`, sagt aber "Wir schliessen auf …" statt des
 *              Angebots — sonst fragt es nach etwas, das schon unterwegs ist.
 *   packs    → es steht fest, dass dieser Spot Geld kostet
 */
export type LockedOffer = 'signup' | 'claiming' | 'packs';

export function resolveLockedOffer({
  uid,
  mapUid,
  claimingSlug,
  slug,
}: LockedOfferFacts): LockedOffer {
  // Kein Konto: die einzige Sprosse, die als nächstes kommt, ist die Anmeldung.
  if (uid === null) return 'signup';
  // Angemeldet, aber die Karte weiß es noch nicht. Dieser Spot sieht gesperrt
  // aus, weil noch niemand gefragt hat — nicht, weil er Geld kostet.
  if (mapUid !== uid) return 'signup';
  // Der Claim für genau diesen Spot läuft noch. Er ist gleich offen oder
  // begründet abgelehnt; beides ist keine Kaufaufforderung.
  if (claimingSlug === slug) return 'claiming';
  return 'packs';
}
