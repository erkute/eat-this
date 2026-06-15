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

// Compact count for the photo badge: exact integers up to 999, then K
// abbreviation (1.2k / 1,2k by locale) — the social-app convention. Below 1
// returns '' (the caller renders nothing). de uses a comma decimal.
export function heartCountShort(count: number, locale = 'de'): string {
  if (!Number.isFinite(count) || count < 1) return ''
  const n = Math.floor(count)
  if (n < 1000) return String(n)
  const k = n / 1000
  const s = k.toFixed(k < 10 ? 1 : 0).replace(/\.0$/, '')
  return (locale === 'en' ? s : s.replace('.', ',')) + 'k'
}
