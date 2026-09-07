// Pure pool math for referral bonuses. No I/O — fully unit-tested.

interface PoolInput {
  /** Der ganze Stapel. */
  allMustEatIds: string[];
  /** Karten, die für den Einladenden schon offen liegen — gekauft, verdient
   *  oder ohnehin öffentlich. Ein Geschenk, das man schon hat, ist keins. */
  inviterFaceUpIds: ReadonlySet<string>;
  /** Dasselbe für den Eingeladenen. Sein Konto ist Minuten alt, das ist also
   *  in aller Regel nur das öffentliche Schaufenster. */
  friendFaceUpIds: ReadonlySet<string>;
}

export function computeReferralPools(input: PoolInput): {
  inviterPool: string[];
  friendPool: string[];
} {
  const { allMustEatIds, inviterFaceUpIds, friendFaceUpIds } = input;
  return {
    inviterPool: allMustEatIds.filter((id) => !inviterFaceUpIds.has(id)),
    friendPool: allMustEatIds.filter((id) => !friendFaceUpIds.has(id)),
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
