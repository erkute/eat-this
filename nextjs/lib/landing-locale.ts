export type Locale = 'de' | 'en'

type WithLocale<Base extends string> = {
  [K in `${Base}De` | `${Base}En`]?: string
}

type WithLocaleArray<Base extends string> = {
  [K in `${Base}De` | `${Base}En`]?: string[]
}

export function pickLocale<Base extends string>(
  obj: WithLocale<Base> | null | undefined,
  base: Base,
  locale: Locale
): string {
  if (!obj) return ''
  const de = obj[`${base}De` as `${Base}De`]
  const en = obj[`${base}En` as `${Base}En`]
  if (locale === 'de') return de || en || ''
  return en || de || ''
}

export function pickLocaleArray<Base extends string>(
  obj: WithLocaleArray<Base> | null | undefined,
  base: Base,
  locale: Locale
): string[] {
  if (!obj) return []
  const de = obj[`${base}De` as `${Base}De`]
  const en = obj[`${base}En` as `${Base}En`]
  // Treat explicit empty array as "present and empty" — do not fall back
  if (locale === 'de') return de ?? en ?? []
  return en ?? de ?? []
}

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  )
}
