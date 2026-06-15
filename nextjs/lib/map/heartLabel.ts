// Public heart-count phrase. Returns null below 1 so we never render an empty
// "loved by 0 people". See docs/specs/2026-06-09-hearts-design.md.
export function heartLabel(count: number, locale: string): string | null {
  if (!Number.isFinite(count) || count < 1) return null
  const n = Math.floor(count)
  if (locale === 'en') {
    return n === 1 ? 'loved by 1 person' : `loved by ${n} people`
  }
  return n === 1 ? 'geherzt von 1 Person' : `geherzt von ${n} Leuten`
}
