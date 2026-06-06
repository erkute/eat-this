/**
 * Shorten a Berlin district name for the editorial-list mustard sticker.
 * Only "Prenzlauer Berg" needs abbreviating — it's the one name long
 * enough to bust the sticker layout. Everything else passes through.
 *
 * null/undefined → null; empty string → empty string so callers can
 * distinguish "no bezirk" from "abbreviated bezirk".
 */
export function abbreviateBezirk(name: string | null | undefined): string | null {
  if (name == null) return null
  if (name === '') return ''
  if (name.toLowerCase() === 'prenzlauer berg') return "P'berg"
  return name
}
