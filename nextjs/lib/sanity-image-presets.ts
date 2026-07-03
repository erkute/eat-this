// Single source of truth for the Sanity-CDN transform params baked into GROQ
// image projections. GROQ can't import JS, so queries interpolate the snippet
// these helpers return — change a width/quality here instead of grepping eight
// projections across three files.
//
// Runtime image rendering goes through `lib/sanityImageLoader.ts` (next/image);
// these presets are only for the *initial* URL a projection ships.

interface Preset {
  w: number
  q: number
  h?: number
  fit?: 'crop'
}

const IMAGE_PRESETS = {
  // Restaurant + article hero (detail pages)
  detailHero: { w: 1200, q: 85 },
  // Bezirk hero (wider crop)
  bezirkHero: { w: 1600, q: 85 },
  // Standard restaurant / article card photo
  card: { w: 800, q: 80 },
  // Map list/marker thumbnail
  mapCard: { w: 600, q: 80 },
  // Inline must-eat dish card inside an article
  articleDish: { w: 400, q: 80 },
  // The restaurant photo on an inline must-eat card
  articleDishRestaurant: { w: 500, q: 75 },
  // Square buddy retrieval thumbnail
  buddyThumb: { w: 120, h: 120, fit: 'crop', q: 80 },
  // Restaurant detail-sheet gallery strip (fixed 4:3 crop for a uniform look)
  galleryThumb: { w: 400, h: 300, fit: 'crop', q: 80 },
} as const satisfies Record<string, Preset>

export type ImagePresetName = keyof typeof IMAGE_PRESETS

/** The `?w=…&auto=format&q=…` query string for a preset (param order matches
 *  the hand-written projections this replaced — keep it stable). */
export function presetQuery(preset: ImagePresetName): string {
  const p: Preset = IMAGE_PRESETS[preset]
  let qs = `?w=${p.w}`
  if (p.h != null) qs += `&h=${p.h}`
  if (p.fit != null) qs += `&fit=${p.fit}`
  qs += `&auto=format&q=${p.q}`
  return qs
}

/** A GROQ image-URL snippet: `<path>.asset->url + "<preset query>"`.
 *  `path` is the dereference expression up to the image field, e.g.
 *  `image`, `restaurantRef->image`, `mustEatRef->restaurantRef->image`. */
export function groqImageUrl(path: string, preset: ImagePresetName): string {
  return `${path}.asset->url + "${presetQuery(preset)}"`
}
