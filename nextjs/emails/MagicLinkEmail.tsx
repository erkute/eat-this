import {
  Body,
  Container,
  Head,
  Heading,
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

/** One curated restaurant: its photo on the left, its Must-Eat cards on the right. */
export interface EmailSpot {
  name: string;
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

// Brand-display stack: Anton where the client supports webfonts (Apple/iOS
// Mail), heavy condensed system fallback everywhere else.
const DISPLAY_FONT =
  "'Anton', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";
const BODY_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Banner-crop a Sanity CDN URL for the restaurant layer — server-side crop so
// we don't rely on object-fit (unsupported in several email clients).
function restaurantBanner(photo: string): string {
  return `${photo.split('?')[0]}?w=640&h=360&fit=crop&auto=format&q=80`;
}

// Size a Sanity CDN image without cropping — the Must-Eat cards are pre-composed
// portrait artwork, kept whole and shown larger so they read as cards.
function cardImage(photo: string): string {
  return `${photo.split('?')[0]}?w=400&auto=format&q=80`;
}

export default function MagicLinkEmail({
  magicLink,
  appUrl,
  restaurants = [],
}: MagicLinkEmailProps) {
  const spots = restaurants.slice(0, 4);

  return (
    <Html lang="de">
      <Head>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');`}</style>
      </Head>
      <Preview>Dein Login-Link für Eat This — tipp drauf, du bist drin.</Preview>

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
          {/* BRAND — wordmark + red handwritten slogan */}
          <Section style={{ textAlign: 'center', padding: '0 0 22px' }}>
            <Img
              src={`${appUrl}/pics/eat-this-logo.webp`}
              alt="Eat This"
              width="132"
              style={{
                display:  'block',
                margin:   '0 auto 16px',
                maxWidth: '42%',
                height:   'auto',
              }}
            />
            <Img
              src={`${appUrl}/pics/launch-tagline.webp`}
              alt="We tell you what to eat."
              width="300"
              style={{
                display:  'block',
                margin:   '0 auto',
                maxWidth: '80%',
                height:   'auto',
              }}
            />
          </Section>

          {/* HEADLINE — big editorial brand statement */}
          <Section style={{ textAlign: 'center', padding: '6px 0 18px' }}>
            <Heading
              as="h1"
              style={{
                margin:        0,
                fontFamily:    DISPLAY_FONT,
                fontWeight:    400,
                fontSize:      '34px',
                lineHeight:    1.04,
                letterSpacing: '0.01em',
                textTransform: 'uppercase',
                color:         PALETTE.ink,
              }}
            >
              Deine kuratierte
            </Heading>
            {/* Second line carries the yellow brand highlight */}
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              align="center"
              style={{ margin: '8px auto 0', borderCollapse: 'collapse' }}
            >
              <tbody>
                <tr>
                  <td
                    align="center"
                    style={{
                      backgroundColor: PALETTE.yellow,
                      padding:         '3px 12px 5px',
                      borderRadius:    '6px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily:    DISPLAY_FONT,
                        fontWeight:    400,
                        fontSize:      '34px',
                        lineHeight:    1.04,
                        letterSpacing: '0.01em',
                        textTransform: 'uppercase',
                        color:         PALETTE.ink,
                      }}
                    >
                      Food Discovery Map
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
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

            {/* Yellow CTA — logo color + hard brand shadow */}
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              align="center"
              style={{ margin: '0 auto' }}
            >
              <tbody>
                <tr>
                  <td
                    align="center"
                    style={{
                      backgroundColor: PALETTE.yellow,
                      borderRadius:    '8px',
                      boxShadow:        `4px 4px 0 ${PALETTE.ink}`,
                    }}
                  >
                    <Link
                      href={magicLink}
                      style={{
                        display:        'inline-block',
                        padding:        '16px 46px',
                        color:          PALETTE.ink,
                        fontSize:       '16px',
                        fontWeight:     800,
                        letterSpacing:  '0.04em',
                        textTransform:  'uppercase',
                        textDecoration: 'none',
                      }}
                    >
                      Anmelden
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>

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
          </Section>

          {/* SPOTS — curated restaurants: the proof, branded + crisp */}
          {spots.length > 0 && (
            <Section style={{ padding: '0 0 8px' }}>
              {spots.map((s, i) => {
                const mustEat = s.mustEats[0];
                return (
                  <table
                    key={`${s.name}-${i}`}
                    role="presentation"
                    cellPadding={0}
                    cellSpacing={0}
                    border={0}
                    width="100%"
                    style={{ borderCollapse: 'collapse' }}
                  >
                    <tbody>
                      <tr>
                        <td align="center" style={{ padding: '20px 0' }}>
                          {/* centered restaurant layer with the Must-Eat card tucked onto its corner */}
                          <div
                            style={{
                              position:     'relative',
                              display:      'inline-block',
                              width:        '360px',
                              maxWidth:     '100%',
                              textAlign:    'left',
                            }}
                          >
                            {/* restaurant layer — square, photo + name + bezirk · kategorie */}
                            <div
                              style={{
                                position:        'relative',
                                zIndex:          1,
                                backgroundColor: PALETTE.paper,
                                overflow:        'hidden',
                                boxShadow:        '0 8px 22px rgba(10,10,10,0.10)',
                              }}
                            >
                              <Img
                                src={restaurantBanner(s.photo)}
                                alt={s.name}
                                width="360"
                                style={{ display: 'block', width: '100%', height: 'auto' }}
                              />
                              <div style={{ padding: '14px 18px 16px' }}>
                                <Text
                                  style={{
                                    margin:        '0 0 3px',
                                    fontSize:      '11px',
                                    fontWeight:    700,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    color:         PALETTE.muted,
                                  }}
                                >
                                  {[s.area, s.cuisine].filter(Boolean).join(' · ')}
                                </Text>
                                <Text
                                  style={{
                                    margin:        0,
                                    fontFamily:    DISPLAY_FONT,
                                    fontWeight:    400,
                                    fontSize:      '28px',
                                    lineHeight:    1.0,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase',
                                    color:         PALETTE.ink,
                                  }}
                                >
                                  {s.name}
                                </Text>
                              </div>
                            </div>
                            {/* Must-Eat card — tucked onto the top-right corner like the spot's badge */}
                            {mustEat && (
                              <Img
                                src={cardImage(mustEat.cardPhoto)}
                                alt={`Must Eat: ${mustEat.dish}`}
                                width="112"
                                style={{
                                  position:  'absolute',
                                  top:       '-22px',
                                  right:     '-28px',
                                  zIndex:    2,
                                  width:     '112px',
                                  height:    'auto',
                                  transform: 'rotate(7deg)',
                                  filter:    'drop-shadow(0 12px 20px rgba(10,10,10,0.26))',
                                }}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                );
              })}
            </Section>
          )}

          {/* HERO — starter pack, dead centered */}
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
              src={`${appUrl}/pics/booster/booster_free.webp`}
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
