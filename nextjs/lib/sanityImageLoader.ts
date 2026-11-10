import { resizeSanityImage } from './sanity-image-presets';

/** Sanity handles resizing directly, retaining the editor's crop and focus. */
export default function sanityImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  return resizeSanityImage(src, width, quality ?? 80);
}
