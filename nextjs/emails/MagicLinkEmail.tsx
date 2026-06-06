import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

/** One Must-Eat collectible card belonging to a spot. */
export interface EmailMustEat {
  /** Dish name, e.g. "Breakfast Plate". */
  dish: string;
  /** Card artwork — raw Sanity CDN URL (query string optional). */
  cardPhoto: string;
}

/** One curated restaurant teased in the email. */
export interface EmailSpot {
  name: string;
  /** Sanity slug — drives the /map?r= deep-link and the composed card image. */
  slug: string;
  /** Neighborhood / district, e.g. "Mitte". */
  area: string;
  /** Cuisine label, e.g. "Bakery". */
  cuisine?: string;
  /** Restaurant photo — raw Sanity CDN URL (query string optional). */
  photo: string;
  /** Matching Must-Eat cards (1–3 shown). */
  mustEats: EmailMustEat[];
}

export interface MagicLinkEmailProps {
  /** The Firebase sign-in link the user clicks to authenticate. */
  magicLink: string;
  /** Absolute base URL for image assets (https://www.eatthisdot.com or http://localhost:3000). */
  appUrl: string;
  /** Up to four curated restaurants to tease inside the email. */
  restaurants?: EmailSpot[];
  /** True when the email already has an account — drops the first-time starter-pack framing. */
  returning?: boolean;
}

const PALETTE = {
  ink:    '#0A0A0A',
  paper:  '#FFFFFF',
  cream:  '#F7F2E8',
  yellow: '#F5C518',
  red:    '#E32831',
  hair:   '#ECE5D5',
  muted:  '#6B6B6B',
};

// Body copy only — every display-font surface (headline, spot cards) is a
// pre-rendered image, because Gmail never loads webfonts.
const BODY_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function MagicLinkEmail({
  magicLink,
  appUrl,
  restaurants = [],
  returning = false,
}: MagicLinkEmailProps) {
  const spots = restaurants.slice(0, 4);

  // First-time signup pitches the product; a returning login just greets back.
  // The headline is a pre-rendered Schoolbell PNG (yellow highlight baked in):
  // Gmail never loads webfonts, so live text always fell back to Arial Black —
  // an image is the only way the brand font reaches Gmail. The alt text keeps
  // the full wording for blocked-images clients and screen readers.
  const headline = returning
    ? { src: 'headline-returning.png', alt: 'Willkommen zurück.', width: 189 }
    : { src: 'headline-first.png', alt: 'Deine kuratierte Food Discovery Map', width: 320 };
  const preview = returning
    ? 'Willkommen zurück bei Eat This — tipp drauf, du bist drin.'
    : 'Dein Login-Link für Eat This — tipp drauf, du bist drin.';

  return (
    <Html lang="de">
      <Head />
      <Preview>{preview}</Preview>

      <Body
        style={{
          margin:               0,
          padding:              0,
          backgroundColor:      PALETTE.cream,
          fontFamily:           BODY_FONT,
          color:                PALETTE.ink,
          WebkitTextSizeAdjust: '100%',
        }}
      >
        <Container
          style={{
            margin:   '0 auto',
            padding:  '36px 16px 40px',
            maxWidth: '600px',
          }}
        >
          {/* BRAND — wordmark + handwritten slogan. PNG, not WebP: Gmail's
              image proxy transcodes WebP and flattens the alpha channel
              (logo got a white box, slogan a black bar), and Outlook can't
              decode WebP at all. PNG keeps transparency everywhere. */}
          <Section style={{ textAlign: 'center', padding: '0 0 22px' }}>
            <Img
              src={`${appUrl}/pics/email/eat-this-logo.png`}
              alt="Eat This"
              width="220"
              style={{
                display:  'block',
                margin:   '0 auto 14px',
                maxWidth: '62%',
                height:   'auto',
              }}
            />
            <Img
              src={`${appUrl}/pics/email/slogan.png`}
              alt="We tell you what to eat."
              width="300"
              style={{
                display:  'block',
                margin:   '0 auto',
                maxWidth: '78%',
                height:   'auto',
              }}
            />
          </Section>

          {/* HEADLINE — big editorial brand statement, Schoolbell baked into a
              transparent PNG (2x) so the brand font survives Gmail */}
          <Section style={{ textAlign: 'center', padding: '6px 0 18px' }}>
            <Img
              src={`${appUrl}/pics/email/${headline.src}`}
              alt={headline.alt}
              width={headline.width}
              style={{
                display:  'block',
                margin:   '0 auto',
                maxWidth: '88%',
                height:   'auto',
              }}
            />
          </Section>

          {/* SUBLINE + CTA — up top: product line + yellow call-to-action */}
          <Section style={{ textAlign: 'center', padding: '2px 0 24px' }}>
            <Text
              style={{
                margin:     '0 0 20px',
                fontSize:   '16px',
                lineHeight: 1.5,
                color:      PALETTE.muted,
              }}
            >
              mit den besten Restaurants, Cafés und Bars in Berlin.
            </Text>

            {/* Yellow CTA — pre-rendered Schoolbell button image (yellow
                sticker + ink border baked in): Gmail never loads webfonts,
                an image is the only way the brand font reaches the button.
                The whole image is the click target. */}
            <Link href={magicLink} style={{ display: 'block' }}>
              <Img
                src={`${appUrl}/pics/email/cta-anmelden.png`}
                alt="Anmelden"
                width="198"
                style={{
                  display:  'block',
                  margin:   '0 auto',
                  width:    '198px',
                  maxWidth: '70%',
                  height:   'auto',
                  border:   0,
                }}
              />
            </Link>

            <Text
              style={{
                margin:     '14px 0 0',
                fontSize:   '13px',
                lineHeight: 1.5,
                color:      PALETTE.muted,
              }}
            >
              Klick auf den Button, um dich anzumelden und deine Map zu öffnen.
            </Text>

            {spots.length > 0 && (
              <Img
                src={`${appUrl}/pics/email/teaser-spots.png`}
                alt="Diese und mehr Empfehlungen warten auf dich — mit den Must Eats, die du dort unbedingt probieren solltest."
                width="366"
                style={{
                  display:  'block',
                  margin:   '30px auto 0',
                  width:    '366px',
                  maxWidth: '94%',
                  height:   'auto',
                }}
              />
            )}
          </Section>

          {/* SPOTS — each one a single server-composed PNG (photo + scrim +
              name + tilted Must-Eat badge, see /api/email/spot-card) wrapped
              in a /map?r= deep-link. One flat image is the only composition
              email clients can't break: Gmail strips position/transform/
              filter/box-shadow and never loads webfonts. */}
          {spots.length > 0 && (
            <Section style={{ padding: '0 0 8px', textAlign: 'center' }}>
              {spots.map((s, i) => {
                const mustEat = s.mustEats[0];
                const meta = [s.area, s.cuisine].filter(Boolean).join(' · ');
                const alt = `${s.name} — ${meta}${mustEat ? `: ${mustEat.dish}` : ''}`;
                return (
                  <Link
                    key={`${s.slug}-${i}`}
                    href={`${appUrl}/map?r=${s.slug}`}
                    style={{ display: 'block', margin: '0 auto 18px' }}
                  >
                    <Img
                      src={`${appUrl}/api/email/spot-card?slug=${s.slug}&v=3`}
                      alt={alt}
                      width="360"
                      height="360"
                      style={{
                        display:  'block',
                        margin:   '0 auto',
                        width:    '360px',
                        maxWidth: '100%',
                        height:   'auto',
                        border:   0,
                      }}
                    />
                  </Link>
                );
              })}
            </Section>
          )}

          {/* HERO — starter pack, first-time signups only */}
          {!returning && (
            <Section style={{ textAlign: 'center', padding: '30px 0 4px' }}>
              <Text
                style={{
                  margin:        '0 0 18px',
                  fontSize:      '12px',
                  fontWeight:    700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color:         PALETTE.muted,
                }}
              >
                Dein Starter Pack
              </Text>
              <Img
                src={`${appUrl}/pics/email/booster_free.png`}
                alt="Dein Eat This Starter Pack — 20 Must Eats"
                width="216"
                style={{
                  display:  'block',
                  margin:   '0 auto',
                  maxWidth: '58%',
                  height:   'auto',
                }}
              />
            </Section>
          )}

          {/* FOOTER */}
          <Section style={{ padding: '28px 16px 0', textAlign: 'center' }}>
            <Text
              style={{
                margin:     '0 0 10px',
                fontSize:   '12px',
                lineHeight: 1.5,
                color:      PALETTE.muted,
              }}
            >
              Der Link ist 1 Stunde gültig und nur für deine E-Mail-Adresse bestimmt.
            </Text>
            <Text
              style={{
                margin:     '0 0 6px',
                fontSize:   '12px',
                lineHeight: 1.5,
                color:      PALETTE.muted,
              }}
            >
              Du bekommst diese E-Mail, weil du dich bei{' '}
              <Link href={appUrl} style={{ color: PALETTE.ink, textDecoration: 'underline' }}>
                eatthisdot.com
              </Link>{' '}
              angemeldet hast.
            </Text>
            <Text
              style={{
                margin:     0,
                fontSize:   '12px',
                lineHeight: 1.5,
                color:      PALETTE.muted,
              }}
            >
              Nicht angefordert? Ignoriere diese E-Mail einfach.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
