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
  /** --et-home-photo-rest: what shows while a photo is missing. */
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

/** Höhe der Must-Eat-Karte im Bild; die Breite folgt ihrem Format (720×989). */
const CARD_HEIGHT = 620;
const CARD_WIDTH = Math.round((CARD_HEIGHT * 720) / 989);

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

      {/* scrim — --et-home-photo-overlay, so the type stays readable on any photo */}
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

      {/* die Must-Eat-Karte — rechts, leicht gekippt, wie sie auf der Map
          neben dem Spot liegt. Gmail entfernt `transform`, hier ist sie
          eingebacken. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={spot.card}
        alt=""
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        style={{
          position: 'absolute',
          right: 56,
          top: (SPOT_CARD_HEIGHT - CARD_HEIGHT) / 2,
          transform: 'rotate(3deg)',
        }}
      />

      {/* name + district — bottom left, exactly as on the home rail */}
      <div
        style={{
          position: 'absolute',
          left: 48,
          bottom: 44,
          width: SPOT_CARD_WIDTH - 96 - CARD_WIDTH - 40,
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
