/** Pure extractor: pull a valid homeBezirk slug out of a user-doc data object. */
export function extractHomeBezirk(data: Record<string, unknown> | undefined): string | null {
  const v = data?.homeBezirk
  return typeof v === 'string' && v.length > 0 ? v : null
}
