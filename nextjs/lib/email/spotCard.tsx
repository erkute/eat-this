// Server-composed email spot card — the JSX tree Satori (next/og ImageResponse)
// renders into one flat 720×720 PNG: restaurant photo, scrim, meta + name in
// brand fonts, Must-Eat card tilted onto the top-right corner. Composing
// server-side is the only way this survives email clients: Gmail strips
// position/transform/filter/box-shadow and never loads webfonts.

import type { EmailSpot } from '@/emails/MagicLinkEmail';

/** Rendered bitmap size — 2x of the 360px CSS display size in the email. */
export const SPOT_CARD_SIZE = 720;

const PALETTE = {
  ink:   '#0A0A0A',
  cream: '#F7F2E8',
};

// Sanity slugs only — anything else is rejected before it reaches GROQ.
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,99}$/.test(slug);
}

// Square server-crop for the photo layer. `fm=jpg` is mandatory: Satori's
// rasterizer (resvg) cannot decode WebP, and `auto=format` would serve it.
export function spotPhotoUrl(photo: string): string {
  return `${photo.split('?')[0]}?w=720&h=720&fit=crop&fm=jpg&q=80`;
}

// Trading-card crop (5:7) for the Must-Eat badge. `fm=png` keeps the alpha.
export function mustEatCardUrl(cardPhoto: string): string {
  return `${cardPhoto.split('?')[0]}?w=400&h=560&fit=crop&fm=png`;
}

type SpotCardData = Pick<
  EmailSpot,
  'name' | 'area' | 'cuisine' | 'photo' | 'mustEats'
>;

// The badge hangs OFF the photo corner: the canvas keeps a cream margin on
// top/right (matches the email body background, so the JPEG reads as
// transparent) and the photo sits bottom-left. The Must-Eat card straddles
// the photo's top-right edge into that margin.
const OVERHANG = 96;
const PHOTO = SPOT_CARD_SIZE - OVERHANG; // 624

// Satori subset: flexbox only, every multi-child element needs display:flex.
export function SpotCardImage({ spot }: { spot: SpotCardData }) {
  const meta = [spot.area, spot.cuisine].filter(Boolean).join(' · ').toUpperCase();
  const mustEat = spot.mustEats[0];

  return (
    <div
      style={{
        width:    SPOT_CARD_SIZE,
        height:   SPOT_CARD_SIZE,
        display:  'flex',
        position: 'relative',
        // Must match the email body bg — the overhang margin poses as
        // transparency in the flattened JPEG.
        backgroundColor: PALETTE.cream,
      }}
    >
      {/* photo sticker — bottom-left, ink border */}
      <div
        style={{
          position: 'absolute',
          left:     0,
          top:      OVERHANG,
          width:    PHOTO,
          height:   PHOTO,
          display:  'flex',
          border:   `4px solid ${PALETTE.ink}`,
          backgroundColor: PALETTE.ink,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={spotPhotoUrl(spot.photo)}
          alt=""
          width={PHOTO - 8}
          height={PHOTO - 8}
          style={{ objectFit: 'cover' }}
        />
      </div>

      {/* scrim — bottom gradient on the photo so the type stays readable */}
      <div
        style={{
          position: 'absolute',
          left:     4,
          bottom:   4,
          width:    PHOTO - 8,
          height:   300,
          backgroundImage:
            'linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0.82) 78%)',
        }}
      />

      {/* meta + name — bottom left, on the photo */}
      <div
        style={{
          position:      'absolute',
          left:          36,
          bottom:        32,
          width:         PHOTO - 72,
          display:       'flex',
          flexDirection: 'column',
        }}
      >
        {meta && (
          <div
            style={{
              fontFamily:    'Saira Condensed',
              fontSize:      27,
              fontWeight:    800,
              letterSpacing: 4,
              color:         PALETTE.cream,
              marginBottom:  6,
            }}
          >
            {meta}
          </div>
        )}
        <div
          style={{
            fontFamily: 'Schoolbell',
            fontSize:   72,
            lineHeight: 1.05,
            color:      PALETTE.cream,
          }}
        >
          {spot.name}
        </div>
      </div>

      {/* Must-Eat card — hangs off the photo's top-right corner into the
          cream margin, tilted hard. Inset from the canvas edges: rotation
          happens around the center, so the corners swing ~28px past the
          element box horizontally and ~18px vertically — without the inset
          they get clipped at the canvas bounds. No drop shadow: cutouts
          ship without shadows (brand rule). */}
      {mustEat && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mustEatCardUrl(mustEat.cardPhoto)}
          alt=""
          width={180}
          height={252}
          style={{
            position:  'absolute',
            top:       22,
            right:     30,
            transform: 'rotate(14deg)',
          }}
        />
      )}
    </div>
  );
}
