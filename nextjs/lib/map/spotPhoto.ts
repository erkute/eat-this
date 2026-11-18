import sanityImageLoader from '@/lib/sanityImageLoader';
import { sanitySrcSet } from '@/lib/sanity-image-presets';

/**
 * The widths a spot photo is offered in — by the list card AND the restaurant
 * detail's photos, on purpose the same.
 *
 * Sharing the width ladder lets the detail reuse a cached list photo when its
 * display size and crop need the same resolution. With sizes of its own the
 * detail would open on an empty frame and the photo would pop in.
 *
 * Small slots keep their small variants; 3x phones and larger detail views can
 * request 1200/1600/2400. Never upscale past the source dimensions.
 */
const SPOT_PHOTO_WIDTHS = [400, 600, 700, 900, 1200, 1600, 2400] as const;

/** The largest width, for a plain `src` or a CSS background. */
const SPOT_PHOTO_MAX_WIDTH = SPOT_PHOTO_WIDTHS[SPOT_PHOTO_WIDTHS.length - 1];

export function spotPhotoSrc(src: string): string {
  return sanityImageLoader({ src, width: SPOT_PHOTO_MAX_WIDTH });
}

export function spotPhotoSrcSet(src: string): string {
  return sanitySrcSet(src, [...SPOT_PHOTO_WIDTHS]) ?? '';
}
