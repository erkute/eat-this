'use client'

// Custom next/image loader for Sanity CDN URLs.
//
// Sanity's CDN already does WebP conversion (`?auto=format`) and resizing
// (`?w=`), so we pass the raw CDN URL through with a width-modulated query
// string. This skips Next's `/_next/image` proxy — one hop instead of two —
// and lets next/image build a real responsive `srcset` against the same
// CDN that other images already hit.
//
// Wired up via `images.loaderFile` in `next.config.ts` so every <Image>
// goes through this; passing `loader` per-component would fail because
// functions can't cross the Server → Client component boundary.

const DEFAULT_QUALITY = 80

export default function sanityImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  // Strip any pre-existing query string the GROQ projection may have added,
  // so we don't end up with duplicated `?w=`/`?q=` params.
  const base = src.split('?')[0]
  const q = quality ?? DEFAULT_QUALITY
  return `${base}?w=${width}&auto=format&q=${q}`
}
