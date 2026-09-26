/* Kartenbilder kommen aus /api/must-eat-image, nicht von der Sanity-CDN —
   `sanitySrcSet` greift dort nicht, und ohne `?w=` liefert die Route das
   Original (1026×1410, Median 96 kB). Das Profil zog so rund 2,5 MB für ein
   Raster aus Daumennägeln (Prod-Log 25./26.09.2026). Die Breiten sind Sprossen
   der Leiter in app/api/must-eat-image/[id]/route.ts — eine Zahl dazwischen
   rastet dort ohnehin auf die nächste ein und wäre nur ein zweiter Cache-Eintrag. */

const ROUTE_PREFIX = '/api/must-eat-image/';
const CARD_WIDTHS = [180, 360, 440, 720] as const;
const VERSION_LENGTH = 12;

export type MustEatCardWidth = (typeof CARD_WIDTHS)[number];

/** Die Adresse eines Kartenbilds, versioniert mit dem Hash des Motivs.
 *  Die Route antwortet mit bis zu `max-age=1800` — ohne `?v=` zeigte ein
 *  Browser ein getauschtes Motiv bis dahin weiter alt. Der Hash steht ohnehin
 *  im Objektpfad (`premium/must-eats/<id>/<sha256>.webp`); die Route liest
 *  `v` nicht, es trennt nur die Cache-Einträge. */
export function mustEatImageUrl(id: string, imageObjectPath: string): string {
  const version = imageObjectPath
    .slice(imageObjectPath.lastIndexOf('/') + 1)
    .replace(/\.[^.]+$/, '')
    .slice(0, VERSION_LENGTH);
  const base = `${ROUTE_PREFIX}${encodeURIComponent(id)}`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

/** Nur Bilder der Route bekommen eine Breite — die Kartenrückseite aus
 *  `public/pics` läuft unverändert durch, eine schon skalierte URL auch. */
export function isMustEatRouteImage(url: string | undefined): url is string {
  return !!url && url.startsWith(ROUTE_PREFIX) && !/[?&]w=/.test(url);
}

export function mustEatCardSrc<T extends string | undefined>(url: T, width: MustEatCardWidth): T {
  if (!isMustEatRouteImage(url)) return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}w=${width}&auto=format&q=80` as T;
}

export function mustEatCardSrcSet(url: string | undefined): string | undefined {
  if (!isMustEatRouteImage(url)) return undefined;
  return CARD_WIDTHS.map((w) => `${mustEatCardSrc(url, w)} ${w}w`).join(', ');
}
