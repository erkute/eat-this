// Pure pool math for referral bonuses. No I/O — fully unit-tested.

/** Was jemand vom Stapel schon hat — offen ODER als Rücken im Deck. Dieselbe
 *  Vereinigung wie `alreadyHas` im Starter Pack (app/api/starter-pack/route.ts):
 *  es soll nicht zwei Meinungen darüber geben, was jemandem gehört. */
interface Side {
  /** Karten, die offen liegen — gekauft, verdient oder ohnehin öffentlich. */
  faceUpIds: ReadonlySet<string>;
  /** Die verdeckten aus dem Starter Pack und den Packs. Sie stehen mit Nummer
   *  und Lokal im Deck und gehen vor Ort auf — sie sind der Grund hinzugehen. */
  coveredIds: ReadonlySet<string>;
}

interface PoolInput {
  /** Der ganze Stapel. */
  allMustEatIds: string[];
  /** Der Einladende. */
  inviter: Side;
  /** Der Eingeladene. Sein Konto ist Minuten alt, aber das Starter Pack ist zu
   *  diesem Zeitpunkt schon eingelöst (ReferralToastListener ruft erst
   *  /api/starter-pack, dann /api/referral/confirm) — die zwanzig Karten von
   *  dort zählen also mit. */
  friend: Side;
}

/**
 * Verschenkt wird nur, was der Beschenkte noch gar nicht im Deck hat.
 *
 * Bis zum 08.09.2026 zog die Rechnung allein die offenen Karten ab. Der Pool
 * bestand damit beim Stapel von rund 25 Karten fast nur aus den EIGENEN
 * verdeckten Starter-Karten des Beschenkten: sein Album wurde nicht größer —
 * `visible-restaurants.server.ts` zählt offen und verdeckt zusammen —, es
 * drehte sich still eine Karte um, und genau der Anlass, dort hinzugehen, fiel
 * damit weg. Beim Einladenden dasselbe, und der Toast versprach ihm zusätzlich
 * „eine neue Karte liegt in deinem Deck".
 *
 * Auf einem kleinen Stapel bleibt der Pool dadurch oft leer, und dann gibt es
 * eben nichts — ein leeres Versprechen ist schlechter als keins. Mit
 * wachsendem Stapel löst sich das von allein.
 */
export function computeReferralPools(input: PoolInput): {
  inviterPool: string[];
  friendPool: string[];
} {
  const { allMustEatIds, inviter, friend } = input;
  const missing = (side: Side) =>
    allMustEatIds.filter((id) => !side.faceUpIds.has(id) && !side.coveredIds.has(id));
  return {
    inviterPool: missing(inviter),
    friendPool: missing(friend),
  };
}

// Up to n unique items via a partial Fisher-Yates shuffle.
export function sampleN<T>(pool: T[], n: number): T[] {
  const arr = [...pool];
  const k = Math.min(n, arr.length);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr.slice(0, k);
}
