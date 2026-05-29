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
import type { EmailRestaurant } from './emailRestaurants';

export interface MagicLinkEmailProps {
  /** The Firebase sign-in link the user clicks to authenticate. */
  magicLink: string;
  /** Absolute base URL for image assets (https://www.eatthisdot.com or staging origin). */
  appUrl: string;
  /** A few editorial spots for the appetite row. Empty array hides the section. */
  restaurants?: EmailRestaurant[];
}

const PALETTE = {
  ink:    '#0A0A0A',
  paper:  '#FFFFFF',
  cream:  '#F7F2E8',
  muted:  '#6B6B6B',
  hair:   '#ECE4D4',
};

function chunkPairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

export default function MagicLinkEmail({
  magicLink,
  appUrl,
  restaurants = [],
}: MagicLinkEmailProps) {
  const pairs = chunkPairs(restaurants);

  return (
    <Html lang="de">
      <Head />
      <Preview>Dein Login-Link für Eat This — die kuratierte Food-Map für Berlin.</Preview>

      <Body
        style={{
          margin:          0,
          padding:         0,
          backgroundColor: PALETTE.cream,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          color:           PALETTE.ink,
          WebkitTextSizeAdjust: '100%',
        }}
      >
        <Container style={{ margin: '0 auto', padding: '40px 16px 48px', maxWidth: '560px' }}>
          {/* HEADER — launch wordmark + red marker tagline (matches the landing) */}
          <Section style={{ textAlign: 'center', paddingBottom: '6px' }}>
            <Img
              src={`${appUrl}/pics/launch-banner.webp`}
              alt="Eat This"
              width="150"
              style={{ display: 'block', margin: '0 auto 14px', maxWidth: '44%', height: 'auto' }}
            />
            <Img
              src={`${appUrl}/pics/launch-tagline.webp`}
              alt="We tell you what to eat."
              width="320"
              style={{ display: 'block', margin: '0 auto', maxWidth: '82%', height: 'auto' }}
            />
          </Section>

          {/* EXPLAINER — what Eat This is, one breath */}
          <Section style={{ textAlign: 'center', padding: '20px 12px 0' }}>
            <Text style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: PALETTE.ink }}>
              Eat This ist deine kuratierte Food-Map für Berlin: handverlesene Restaurants,
              Cafés und Bars — ehrlich empfohlen, ohne bezahlte Werbung.
            </Text>
          </Section>

          {/* HERO — starter pack */}
          <Section style={{ textAlign: 'center', padding: '24px 0 4px' }}>
            <Img
              src={`${appUrl}/pics/booster/booster_free.webp`}
              alt="Eat This Starter Pack"
              width="240"
              style={{ display: 'block', margin: '0 auto', borderRadius: '12px', maxWidth: '62%', height: 'auto' }}
            />
          </Section>

          {/* APPETITE — a few real spots (omitted entirely when none loaded) */}
          {pairs.length > 0 && (
            <Section
              style={{
                backgroundColor: PALETTE.paper,
                borderRadius:    '20px',
                padding:         '26px 20px 18px',
                marginTop:       '16px',
              }}
            >
              <Heading
                as="h2"
                style={{
                  margin:        '0 0 16px',
                  fontSize:      '12px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontWeight:    700,
                  color:         PALETTE.muted,
                  textAlign:     'center',
                }}
              >
                Ein Vorgeschmack
              </Heading>
              <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  {pairs.map((pair, ri) => (
                    <tr key={ri}>
                      {pair.map((r, ci) => (
                        <td key={ci} width="50%" valign="top" style={{ padding: '6px' }}>
                          <Img
                            src={r.photo}
                            alt={r.name}
                            width="248"
                            style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '12px' }}
                          />
                          <Text style={{ margin: '8px 0 0', fontSize: '14px', fontWeight: 700, lineHeight: 1.3, color: PALETTE.ink }}>
                            {r.name}
                          </Text>
                          {r.meta ? (
                            <Text style={{ margin: '1px 0 0', fontSize: '12px', lineHeight: 1.3, color: PALETTE.muted }}>
                              {r.meta}
                            </Text>
                          ) : null}
                        </td>
                      ))}
                      {pair.length === 1 ? <td width="50%" /> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* CARD — headline + CTA */}
          <Section
            style={{
              backgroundColor: PALETTE.paper,
              borderRadius:    '20px',
              padding:         '36px 28px 32px',
              marginTop:       '16px',
              textAlign:       'center',
            }}
          >
            <Heading
              as="h1"
              style={{
                margin:        '0 0 10px',
                fontSize:      '26px',
                lineHeight:    1.2,
                fontWeight:    800,
                color:         PALETTE.ink,
                letterSpacing: '-0.01em',
              }}
            >
              Einmal klicken, schon drin.
            </Heading>

            <Text style={{ margin: '0 0 28px', fontSize: '16px', lineHeight: 1.55, color: PALETTE.muted }}>
              Bestätige deinen Login — dann zeigen wir dir, was du essen musst.
            </Text>

            {/* CTA Button — table-based for max email-client compatibility */}
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} align="center" style={{ margin: '0 auto' }}>
              <tbody>
                <tr>
                  <td align="center" style={{ backgroundColor: PALETTE.ink, borderRadius: '999px' }}>
                    <Link
                      href={magicLink}
                      style={{
                        display:        'inline-block',
                        padding:        '16px 40px',
                        color:          PALETTE.paper,
                        fontSize:       '16px',
                        fontWeight:     700,
                        letterSpacing:  '0.02em',
                        textDecoration: 'none',
                      }}
                    >
                      Anmelden
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>

            <Text style={{ margin: '24px 0 0', fontSize: '13px', lineHeight: 1.5, color: PALETTE.muted }}>
              Der Link ist 1 Stunde gültig und nur für deine E-Mail-Adresse bestimmt.
            </Text>
          </Section>

          {/* FOOTER */}
          <Section style={{ padding: '20px 16px 0', textAlign: 'center' }}>
            <Text style={{ margin: '0 0 6px', fontSize: '12px', lineHeight: 1.5, color: PALETTE.muted }}>
              Du bekommst diese E-Mail, weil du dich bei{' '}
              <Link href={appUrl} style={{ color: PALETTE.ink, textDecoration: 'underline' }}>
                eatthisdot.com
              </Link>{' '}
              angemeldet hast.
            </Text>
            <Text style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: PALETTE.muted }}>
              Nicht angefordert? Ignoriere diese E-Mail einfach.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
