// Server-composed email spot card — the JSX tree Satori (next/og ImageResponse)
// renders into one flat 1072×804 image: restaurant photo, bottom scrim, name and
// district in the brand font, and the spot's open Must Eat card beside it.
//
// It is the `.hv-photo` card from home, flattened. Composing server-side is the
// only way this survives email clients: Gmail strips position/transform/filter/
// box-shadow and never loads webfonts.

import { BRAND_FONT_NAME } from '@/lib/email/brandFont';

/** Rendered bitmap size — 2x of the 536px CSS display width in the email. */
export const SPOT_CARD_WIDTH = 1072;
/** 4:3, the proportion the home rail uses for restaurant photos. */
export const SPOT_CARD_HEIGHT = 804;

const PALETTE = {
  ink: '#15120e',
  paper: '#ffffff',
  /** --et-ink-raised: what shows while a photo is missing. */
  photoRest: '#eceae6',
};

// Sanity slugs only — anything else is rejected before it reaches GROQ.
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,99}$/.test(slug);
}

// Server-crop for the photo layer. `fm=jpg` is mandatory: Satori's rasterizer
// (resvg) cannot decode WebP, and `auto=format` would serve it.
export function spotPhotoUrl(photo: string): string {
  return `${photo.split('?')[0]}?w=${SPOT_CARD_WIDTH}&h=${SPOT_CARD_HEIGHT}&fit=crop&fm=jpg&q=80`;
}

/** Was eine Karte zum Zeichnen braucht. */
export interface SpotCardData {
  name: string;
  /** Bezirk, z. B. „Mitte". */
  area: string;
  /** Roh-URL aus dem Sanity-CDN, Query-String optional. */
  photo: string;
  /** Die offene Must-Eat-Karte des Spots als PNG-Data-URI (Satori liest
   *  kein WebP). Sie steht rechts neben dem Namen: die Mail soll zeigen,
   *  dass zu jedem Spot eine Karte gehört (Betreiber, 22.09.2026). */
  card: string;
}

/** Die Must-Eat-Karte oben rechts, wie `.mustPeek` auf der Restaurantliste
 *  (dort 54–68 px auf rund 360 px Kartenbreite, 5° gekippt) — hier etwas
 *  grösser, 120 px auf 536 px Anzeigebreite. Grösser deckte sie das Foto zu
 *  (Betreiber, 22.09.2026). Breite im 2x-Bitmap; die Höhe folgt dem Format
 *  der Karte (720×989). */
const CARD_WIDTH = 240;
const CARD_HEIGHT = Math.round((CARD_WIDTH * 989) / 720);

// Satori subset: flexbox only, every multi-child element needs display:flex.
export function SpotCardImage({ spot }: { spot: SpotCardData }) {
  /* Nur der Bezirk: „Mitte · Bakery" sagte, was die Karte ohnehin zeigt
     (Betreiber, 22.09.2026). */
  const meta = spot.area;

  return (
    <div
      style={{
        width: SPOT_CARD_WIDTH,
        height: SPOT_CARD_HEIGHT,
        display: 'flex',
        position: 'relative',
        backgroundColor: PALETTE.photoRest,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={spotPhotoUrl(spot.photo)}
        alt=""
        width={SPOT_CARD_WIDTH}
        height={SPOT_CARD_HEIGHT}
        style={{ objectFit: 'cover' }}
      />

      {/* scrim — --et-photo-overlay, so the type stays readable on any photo */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: SPOT_CARD_WIDTH,
          height: 480,
          // Deliberately heavy: restaurant photos are often bright (white
          // plates, daylight), and a polite scrim leaves the name unreadable
          // exactly on the images people like most.
          backgroundImage:
            'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 52%, rgba(0,0,0,0.88) 100%)',
        }}
      />

      {/* die Must-Eat-Karte — oben rechts, gekippt wie auf der Restaurantliste.
          Gmail entfernt `transform`, hier ist sie eingebacken. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={spot.card}
        alt=""
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        style={{
          position: 'absolute',
          right: 36,
          top: 36,
          transform: 'rotate(5deg)',
        }}
      />

      {/* name + district — bottom left, exactly as on the home rail */}
      <div
        style={{
          position: 'absolute',
          left: 48,
          bottom: 44,
          width: SPOT_CARD_WIDTH - 96,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontFamily: BRAND_FONT_NAME,
            fontWeight: 700,
            fontSize: 66,
            lineHeight: 1.05,
            letterSpacing: -1,
            color: PALETTE.paper,
          }}
        >
          {spot.name}
        </div>
        {meta && (
          <div
            style={{
              fontFamily: BRAND_FONT_NAME,
              fontWeight: 400,
              fontSize: 34,
              marginTop: 8,
              color: PALETTE.paper,
              opacity: 0.82,
            }}
          >
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}
