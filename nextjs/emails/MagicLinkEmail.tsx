import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
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

// Warm, airy cream layout — brand assets sit free on the page (no bands, no
// boxed cards, no hard rules). Readable system sans throughout; gentle radii.
const C = {
  cream:  '#FBF8EE',
  ink:    '#1A1A1A',
  yellow: '#FFD84A',
  muted:  '#6B5A44',
  hair:   '#E7DEC9',
};
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

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
      <Preview>Dein Login-Link für Eat This — die curated food discovery map für Berlin.</Preview>

      <Body style={{ margin: 0, padding: 0, backgroundColor: C.cream, fontFamily: SANS, color: C.ink, WebkitTextSizeAdjust: '100%' }}>
        <Container style={{ margin: '0 auto', padding: '40px 24px 44px', maxWidth: '540px', backgroundColor: C.cream }}>

          {/* BRAND — wordmark + red tagline, free on cream */}
          <Section style={{ textAlign: 'center' }}>
            <Img
              src={`${appUrl}/pics/launch-banner.webp`}
              alt="Eat This"
              width="150"
              style={{ display: 'block', margin: '0 auto 16px', maxWidth: '42%', height: 'auto' }}
            />
            <Img
              src={`${appUrl}/pics/launch-tagline.webp`}
              alt="We tell you what to eat."
              width="320"
              style={{ display: 'block', margin: '0 auto', maxWidth: '84%', height: 'auto' }}
            />
          </Section>

          {/* PACK + VALUE — side by side, simple, recognizable */}
          <Section style={{ padding: '32px 0 0' }}>
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%" style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td width="42%" valign="middle">
                    <Img
                      src={`${appUrl}/pics/booster/booster_free.webp`}
                      alt="Eat This Starter Pack"
                      width="200"
                      style={{ display: 'block', width: '100%', maxWidth: '200px', height: 'auto' }}
                    />
                  </td>
                  <td width="58%" valign="middle" style={{ paddingLeft: '20px' }}>
                    <Text style={{ margin: 0, fontSize: '18px', lineHeight: 1.45, fontWeight: 700, color: C.ink }}>
                      Deine{' '}
                      <span style={{ backgroundColor: C.yellow, padding: '1px 4px', WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}>
                        curated food discovery map
                      </span>{' '}
                      für Berlin.
                    </Text>
                    <Text style={{ margin: '14px 0 0', fontSize: '14px', lineHeight: 1.55, color: C.muted }}>
                      Mit dem Login kommen weitere Must Eats und Spots dazu.
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* APPETITE — real spots, free on cream (hidden when none loaded) */}
          {pairs.length > 0 && (
            <Section style={{ padding: '34px 0 0' }}>
              <Hr style={{ border: 'none', borderTop: `1px solid ${C.hair}`, margin: '0 0 22px' }} />
              <Text style={{ margin: '0 0 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, textAlign: 'center' }}>
                Ein Vorgeschmack
              </Text>
              <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  {pairs.map((pair, ri) => (
                    <tr key={ri}>
                      {pair.map((r, ci) => (
                        <td key={ci} width="50%" valign="top" style={{ padding: '7px' }}>
                          <Img
                            src={r.photo}
                            alt={r.name}
                            width="240"
                            style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '6px' }}
                          />
                          <Text style={{ margin: '9px 0 0', fontSize: '14px', fontWeight: 700, lineHeight: 1.3, color: C.ink }}>
                            {r.name}
                          </Text>
                          {r.meta ? (
                            <Text style={{ margin: '2px 0 0', fontSize: '12.5px', lineHeight: 1.3, color: C.muted }}>
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

          {/* CTA */}
          <Section style={{ textAlign: 'center', padding: '36px 0 0' }}>
            <Hr style={{ border: 'none', borderTop: `1px solid ${C.hair}`, margin: '0 0 30px' }} />
            <Heading
              as="h1"
              style={{ margin: '0 0 10px', fontFamily: SANS, fontSize: '26px', lineHeight: 1.2, fontWeight: 800, letterSpacing: '-0.01em', color: C.ink }}
            >
              Willkommen bei Eat This.
            </Heading>
            <Text style={{ margin: '0 0 26px', fontSize: '16px', lineHeight: 1.55, color: C.muted }}>
              Tipp auf den Button, um dich anzumelden.
            </Text>

            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} align="center" style={{ margin: '0 auto' }}>
              <tbody>
                <tr>
                  <td align="center" style={{ backgroundColor: C.yellow, borderRadius: '8px' }}>
                    <Link
                      href={magicLink}
                      style={{ display: 'inline-block', padding: '16px 42px', color: C.ink, fontSize: '16px', fontWeight: 800, letterSpacing: '0.01em', textDecoration: 'none' }}
                    >
                      Anmelden
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>

            <Text style={{ margin: '22px 0 0', fontSize: '12.5px', lineHeight: 1.5, color: C.muted }}>
              Der Link ist 1 Stunde gültig und nur für deine E-Mail-Adresse bestimmt.
            </Text>
          </Section>

          {/* FOOTER */}
          <Section style={{ padding: '30px 0 0', textAlign: 'center' }}>
            <Hr style={{ border: 'none', borderTop: `1px solid ${C.hair}`, margin: '0 0 18px' }} />
            <Text style={{ margin: '0 0 5px', fontSize: '11.5px', lineHeight: 1.5, color: C.muted }}>
              Du bekommst diese E-Mail, weil du dich bei{' '}
              <Link href={appUrl} style={{ color: C.ink, textDecoration: 'underline' }}>eatthisdot.com</Link>{' '}
              angemeldet hast.
            </Text>
            <Text style={{ margin: 0, fontSize: '11.5px', lineHeight: 1.5, color: C.muted }}>
              Nicht angefordert? Ignoriere diese E-Mail einfach.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
