// Server-composed email spot card — the JSX tree Satori (next/og ImageResponse)
// renders into one flat 1072×804 image: restaurant photo, bottom scrim, name and
// meta in the brand font.
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

/** Was eine Karte zum Zeichnen braucht — genau die Felder aus emailSpotsQuery. */
export interface SpotCardData {
  name: string;
  /** Bezirk, z. B. „Mitte". */
  area: string;
  /** Küche, z. B. „Bakery". Nicht jedes Restaurant hat eine. */
  cuisine?: string;
  /** Roh-URL aus dem Sanity-CDN, Query-String optional. */
  photo: string;
}

// Satori subset: flexbox only, every multi-child element needs display:flex.
export function SpotCardImage({ spot }: { spot: SpotCardData }) {
  const meta = [spot.area, spot.cuisine].filter(Boolean).join(' · ');

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

      {/* name + meta — bottom left, exactly as on the home rail */}
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
