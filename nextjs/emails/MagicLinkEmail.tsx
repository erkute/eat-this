import {
  Body,
  Container,
  Font,
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

// Mockup language: cream surface, pure-black ink, brand yellow, ZERO rounded
// corners, hard 2px black rules. Display = Anton (condensed) with an Impact
// fallback for clients that strip web fonts.
const C = {
  cream:  '#FBF8EE',
  ink:    '#000000',
  yellow: '#FFD84A',
  muted:  '#6B5A44',
};
const DISPLAY = "'Anton', 'Impact', 'Arial Narrow', sans-serif";
const BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const RULE = `2px solid ${C.ink}`;

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
      <Head>
        <Font
          fontFamily="Anton"
          fallbackFontFamily="sans-serif"
          webFont={{ url: 'https://fonts.gstatic.com/s/anton/v25/1Ptgg87LROyAm3Kz-C8.woff2', format: 'woff2' }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>Dein Login-Link für Eat This — die curated food discovery map für Berlin.</Preview>

      <Body style={{ margin: 0, padding: 0, backgroundColor: C.cream, fontFamily: BODY, color: C.ink, WebkitTextSizeAdjust: '100%' }}>
        <Container style={{ margin: '0 auto', padding: '0 0 40px', maxWidth: '560px', backgroundColor: C.cream }}>

          {/* HEADER — black band, yellow wordmark (mockup .hdr) */}
          <Section style={{ backgroundColor: C.ink, padding: '26px 16px', textAlign: 'center' }}>
            <Img
              src={`${appUrl}/pics/launch-banner.webp`}
              alt="Eat This"
              width="160"
              style={{ display: 'block', margin: '0 auto', maxWidth: '46%', height: 'auto' }}
            />
          </Section>

          {/* SLOGAN BAND — yellow, hard black rules top + bottom (mockup .lp-slogan) */}
          <Section style={{ backgroundColor: C.yellow, borderTop: RULE, borderBottom: RULE, padding: '24px 22px', textAlign: 'center' }}>
            <Img
              src={`${appUrl}/pics/launch-tagline.webp`}
              alt="We tell you what to eat."
              width="340"
              style={{ display: 'block', margin: '0 auto', maxWidth: '92%', height: 'auto' }}
            />
          </Section>

          <Section style={{ padding: '0 20px' }}>
            {/* EXPLAINER */}
            <Text style={{ margin: '26px 0 0', fontSize: '15px', lineHeight: 1.6, color: C.ink, textAlign: 'center' }}>
              <strong>Eat This</strong> ist deine curated food discovery map für Berlin:
              handverlesene Restaurants, Cafés und Bars.
            </Text>

            {/* STARTER PACK */}
            <Section style={{ textAlign: 'center', padding: '22px 0 0' }}>
              <Img
                src={`${appUrl}/pics/booster/booster_free.webp`}
                alt="Eat This Starter Pack"
                width="230"
                style={{ display: 'block', margin: '0 auto', maxWidth: '60%', height: 'auto' }}
              />
              <Text style={{ margin: '14px auto 0', maxWidth: '400px', fontSize: '13.5px', lineHeight: 1.5, color: C.muted }}>
                Mit dem Login kommen weitere Spots und Must Eats dazu.
              </Text>
            </Section>

            {/* APPETITE — real spots (hidden when none loaded), hard-edge thumbs */}
            {pairs.length > 0 && (
              <Section style={{ border: RULE, backgroundColor: '#FFFFFF', padding: '22px 16px 14px', marginTop: '26px' }}>
                <Heading
                  as="h2"
                  style={{
                    margin: '0 0 16px', fontFamily: DISPLAY, fontSize: '17px',
                    letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 400,
                    color: C.ink, textAlign: 'center',
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
                              width="244"
                              style={{ display: 'block', width: '100%', height: 'auto', border: RULE }}
                            />
                            <Text style={{ margin: '8px 0 0', fontSize: '14px', fontWeight: 700, lineHeight: 1.25, color: C.ink }}>
                              {r.name}
                            </Text>
                            {r.meta ? (
                              <Text style={{ margin: '1px 0 0', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.3, color: C.muted }}>
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

            {/* CTA — bordered block, Anton headline, hard yellow button */}
            <Section style={{ border: RULE, backgroundColor: '#FFFFFF', padding: '32px 26px', marginTop: '26px', textAlign: 'center' }}>
              <Heading
                as="h1"
                style={{
                  margin: '0 0 10px', fontFamily: DISPLAY, fontSize: '34px', lineHeight: 0.95,
                  letterSpacing: '0.005em', textTransform: 'uppercase', fontWeight: 400, color: C.ink,
                }}
              >
                Willkommen bei Eat This.
              </Heading>
              <Text style={{ margin: '0 0 26px', fontSize: '15px', lineHeight: 1.5, color: C.muted }}>
                Tipp auf den Button, um dich anzumelden.
              </Text>

              {/* Hard yellow CTA rectangle (mockup .cta-pill) */}
              <table role="presentation" cellPadding={0} cellSpacing={0} border={0} align="center" style={{ margin: '0 auto' }}>
                <tbody>
                  <tr>
                    <td align="center" style={{ backgroundColor: C.yellow, border: RULE }}>
                      <Link
                        href={magicLink}
                        style={{
                          display: 'inline-block', padding: '15px 40px', color: C.ink,
                          fontFamily: DISPLAY, fontSize: '17px', letterSpacing: '0.08em',
                          textTransform: 'uppercase', textDecoration: 'none',
                        }}
                      >
                        Anmelden
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>

              <Text style={{ margin: '22px 0 0', fontSize: '12px', lineHeight: 1.5, color: C.muted }}>
                Der Link ist 1 Stunde gültig und nur für deine E-Mail-Adresse bestimmt.
              </Text>
            </Section>

            {/* FOOTER */}
            <Section style={{ padding: '22px 4px 0', textAlign: 'center' }}>
              <Text style={{ margin: '0 0 5px', fontSize: '11.5px', lineHeight: 1.5, color: C.muted }}>
                Du bekommst diese E-Mail, weil du dich bei{' '}
                <Link href={appUrl} style={{ color: C.ink, textDecoration: 'underline' }}>eatthisdot.com</Link>{' '}
                angemeldet hast.
              </Text>
              <Text style={{ margin: 0, fontSize: '11.5px', lineHeight: 1.5, color: C.muted }}>
                Nicht angefordert? Ignoriere diese E-Mail einfach.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
