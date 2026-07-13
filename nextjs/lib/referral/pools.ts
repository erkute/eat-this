// Pure pool math for referral bonuses. No I/O — fully unit-tested.

interface PoolInput {
  allIds:             string[]
  anonIds:            Set<string>
  signedIds:          Set<string>
  inviterEntitledIds: Set<string>
}

// inviterPool = all \ (anon ∪ signed ∪ inviterEntitled)
// friendPool  = all \ (anon ∪ signed)
export function computeReferralPools(
  input: PoolInput,
): { inviterPool: string[]; friendPool: string[] } {
  const { allIds, anonIds, signedIds, inviterEntitledIds } = input
  const friendVisible  = new Set<string>([...anonIds, ...signedIds])
  const inviterVisible = new Set<string>([...friendVisible, ...inviterEntitledIds])
  return {
    inviterPool: allIds.filter((id) => !inviterVisible.has(id)),
    friendPool:  allIds.filter((id) => !friendVisible.has(id)),
  }
}

// Up to n unique items via a partial Fisher-Yates shuffle.
export function sampleN<T>(pool: T[], n: number): T[] {
  const arr = [...pool]
  const k = Math.min(n, arr.length)
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr.slice(0, k)
}
