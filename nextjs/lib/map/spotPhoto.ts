import sanityImageLoader from '@/lib/sanityImageLoader';
import { sanitySrcSet } from '@/lib/sanity-image-presets';

/**
 * The widths a spot photo is offered in — by the list card AND the
 * restaurant detail's photos, on purpose the same.
 *
 * The detail used to ask for its own sizes (1200/1600 in the gallery, the raw
 * 600px payload URL behind it), none of which the list had loaded: opening a
 * spot showed an empty frame, then the photo popped in (user, 23.09.2026).
 * Sharing the width ladder lets the detail reuse a cached list photo when
 * its display size and crop need the same resolution.
 *
 * Small slots keep their small variants; 3x phones and larger detail views
 * can request 1200/1600/2400. Never upscale past the source dimensions.
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
