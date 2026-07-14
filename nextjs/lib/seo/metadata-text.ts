export const METADATA_TITLE_MAX = 60
export const METADATA_DESCRIPTION_MAX = 155
export const METADATA_BRAND_SUFFIX = ' | EAT THIS'
export const METADATA_TITLE_TEXT_MAX = METADATA_TITLE_MAX - METADATA_BRAND_SUFFIX.length

const TRAILING_BRAND = /\s*(?:\||[·—–-])\s*eat this(?: berlin)?$/i

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text

  const slice = text.slice(0, Math.max(1, max - 1)).trimEnd()
  const lastSpace = slice.lastIndexOf(' ')
  const cutAt = lastSpace >= Math.floor(max * 0.6) ? lastSpace : slice.length
  const clean = slice
    .slice(0, cutAt)
    .replace(/[,:;|/—–-]+$/u, '')
    .trimEnd()
  return `${clean}…`
}

export function buildBrandedTitle(title: string): string {
  const clean = title.trim().replace(/\s+/g, ' ').replace(TRAILING_BRAND, '').trim()
  return `${truncateAtWord(clean, METADATA_TITLE_TEXT_MAX)}${METADATA_BRAND_SUFFIX}`
}

export function truncateMetadataDescription(
  text: string,
  max = METADATA_DESCRIPTION_MAX,
): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean.length <= max) return clean
  const slice = clean.slice(0, max)
  const stop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '))
  if (stop >= 40) return slice.slice(0, stop + 1)

  const fallbackSlice = clean.slice(0, max - 2)
  const lastSpace = fallbackSlice.lastIndexOf(' ')
  return `${lastSpace > 0 ? fallbackSlice.slice(0, lastSpace) : fallbackSlice} …`
}
