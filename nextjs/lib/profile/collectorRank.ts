// Collector rank derived purely from how many Must-Eats are revealed.
// Thresholds are fractions of the total catalogue so they scale with it.
export interface Rank {
  key: string;
  minFraction: number;
}

export const RANKS: Rank[] = [
  { key: 'frischling', minFraction: 0 },
  { key: 'entdecker', minFraction: Number.EPSILON },
  { key: 'kenner', minFraction: 0.25 },
  { key: 'local', minFraction: 0.5 },
  { key: 'stadtbekannt', minFraction: 0.8 },
  { key: 'komplett', minFraction: 1 },
];

export function resolveRank(collected: number, total: number): { key: string; level: number } {
  const fraction = total > 0 ? collected / total : 0;
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (fraction >= RANKS[i].minFraction) idx = i;
  }
  return { key: RANKS[idx].key, level: idx + 1 };
}
