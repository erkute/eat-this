/* Kartenbilder kommen aus /api/must-eat-image, nicht von der Sanity-CDN —
   `sanitySrcSet` greift dort nicht, und ohne `?w=` liefert die Route das
   Original (1026×1410, Median 96 kB). Das Profil zog so rund 2,5 MB für ein
   Raster aus Daumennägeln (Prod-Log 25./26.09.2026). Die Breiten sind Sprossen
   der Leiter in app/api/must-eat-image/[id]/route.ts — eine Zahl dazwischen
   rastet dort ohnehin auf die nächste ein und wäre nur ein zweiter Cache-Eintrag. */

const ROUTE_PREFIX = '/api/must-eat-image/';
const CARD_WIDTHS = [180, 360, 440, 720] as const;

export type MustEatCardWidth = (typeof CARD_WIDTHS)[number];

/** Nur Bilder der Route bekommen eine Breite — die Kartenrückseite aus
 *  `public/pics` läuft unverändert durch. */
export function isMustEatRouteImage(url: string | undefined): url is string {
  return !!url && url.startsWith(ROUTE_PREFIX) && !url.includes('?');
}

export function mustEatCardSrc<T extends string | undefined>(url: T, width: MustEatCardWidth): T {
  return (isMustEatRouteImage(url) ? `${url}?w=${width}&auto=format&q=80` : url) as T;
}

export function mustEatCardSrcSet(url: string | undefined): string | undefined {
  if (!isMustEatRouteImage(url)) return undefined;
  return CARD_WIDTHS.map((w) => `${mustEatCardSrc(url, w)} ${w}w`).join(', ');
}
