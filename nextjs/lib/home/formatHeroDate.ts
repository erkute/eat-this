const WD = {
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
} as const

const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Format an ISO date (YYYY-MM-DD) for the hero kicker. Empty string if invalid.
 *   de → "Mo · 01.06."
 *   en → "Mon · Jun 1"
 */
export function formatHeroDate(iso: string, locale: 'de' | 'en' = 'de'): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  const wd = WD[locale][d.getDay()]
  if (locale === 'en') {
    return `${wd} · ${MONTH_EN[d.getMonth()]} ${d.getDate()}`
  }
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${wd} · ${dd}.${mm}.`
}
