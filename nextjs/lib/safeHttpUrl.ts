// Credit URLs come from CMS content (Google attribution data / manual Studio
// entry). Only link out for HTTP(S) so a poisoned value cannot become a
// javascript: href.
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.toString()
      : null
  } catch {
    return null
  }
}
