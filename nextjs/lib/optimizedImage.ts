// Eigene Bilder unter /pics in passender Breite aus Nexts Optimierer, für
// Stellen, die ein schlichtes <img> brauchen (z. B. in <picture> oder mit
// Animations-Attributen). `width` muss in `images.deviceSizes` oder
// `images.imageSizes` (next.config.ts) stehen, sonst antwortet der Optimierer
// mit 400.

export function optimizedImageSrc(src: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=80`;
}

export function optimizedImageSrcSet(src: string, widths: readonly number[]): string {
  return widths.map((width) => `${optimizedImageSrc(src, width)} ${width}w`).join(', ');
}
