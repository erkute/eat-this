/**
 * Pure selection logic for the restaurant photo gallery. Judgments come from
 * Haiku vision scoring (see judgePhotos below); selection is kept pure so it
 * is unit-testable without network. Hero (photos[0]) is excluded by the
 * CALLER — indexes here refer to the gallery candidate list (photos[1..]).
 */

export interface PhotoJudgment {
  index: number
  category: 'food' | 'interior' | 'exterior' | 'drink' | 'menu' | 'unusable'
  score: number
}

const MAX_GALLERY = 4
const SCORE_THRESHOLD = 6
const FALLBACK_COUNT = 3

/** Returns candidate indexes to keep, best first. `judgments === null`
 *  (scoring unavailable) falls back to the first 3 candidates unscored. */
export function selectGalleryPhotos(
  judgments: PhotoJudgment[] | null,
  candidateCount: number,
): number[] {
  if (judgments === null) {
    return Array.from({ length: Math.min(FALLBACK_COUNT, candidateCount) }, (_, i) => i)
  }
  const usable = judgments.filter(
    (jd) =>
      jd.category !== 'unusable' &&
      jd.score >= SCORE_THRESHOLD &&
      jd.index >= 0 &&
      jd.index < candidateCount,
  )
  const sorted = [...usable].sort((a, b) => b.score - a.score)
  const picked: PhotoJudgment[] = []
  // A food shot sells a restaurant better than three interiors — always keep
  // the best usable one, even if other categories out-score it.
  const bestFood = sorted.find((jd) => jd.category === 'food')
  if (bestFood) picked.push(bestFood)
  for (const jd of sorted) {
    if (picked.length >= MAX_GALLERY) break
    if (!picked.includes(jd)) picked.push(jd)
  }
  return picked.slice(0, MAX_GALLERY).map((jd) => jd.index)
}

/** German alt-text label per category, used for gallery image alt fields. */
export const CATEGORY_LABEL_DE: Record<PhotoJudgment['category'], string> = {
  food: 'Gericht',
  interior: 'Innenraum',
  exterior: 'Außenansicht',
  drink: 'Getränk',
  menu: 'Speisekarte',
  unusable: 'Foto',
}
