const WD_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

/** Format an ISO date (YYYY-MM-DD) as "Mo · 01.06." for the hero kicker. Empty string if invalid. */
export function formatHeroDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  const wd = WD_DE[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${wd} · ${dd}.${mm}.`
}
