import sanityImageLoader from '@/lib/sanityImageLoader';

/**
 * The widths a spot photo is offered in — by the list card AND the
 * restaurant detail's photos, on purpose the same.
 *
 * The detail used to ask for its own sizes (1200/1600 in the gallery, the raw
 * 600px payload URL behind it), none of which the list had loaded: opening a
 * spot showed an empty frame, then the photo popped in (user, 23.09.2026).
 * With the same widths the browser picks the same file on the same phone —
 * 94vw vs 100vw both land on 900 — and the detail's first photo, which is the
 * list card's, comes straight from the cache.
 *
 * 700 sits between 600 and 900 for the most common Android class (94vw on a
 * 412px screen at DPR 1.75 = 677px). The top is 900: a 3x iPhone works out
 * ~1100px and took 1200 — 120 KB a photo against 67 KB at 900 (30 catalogue
 * photos, 23.09.2026) — and 900 on a ~370px card is still 2.4 pixels a point.
 */
export const SPOT_PHOTO_WIDTHS = [400, 600, 700, 900] as const;

/** The largest width, for a plain `src` or a CSS background. */
export const SPOT_PHOTO_MAX_WIDTH = SPOT_PHOTO_WIDTHS[SPOT_PHOTO_WIDTHS.length - 1];

export function spotPhotoSrc(src: string): string {
  return sanityImageLoader({ src, width: SPOT_PHOTO_MAX_WIDTH });
}

export function spotPhotoSrcSet(src: string): string {
  return SPOT_PHOTO_WIDTHS.map((width) => `${sanityImageLoader({ src, width })} ${width}w`).join(
    ', '
  );
}
