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

export interface MagicLinkEmailProps {
  /** The Firebase sign-in link the user clicks to authenticate. */
  magicLink: string;
  /** Absolute base URL for image assets (https://www.eatthisdot.com or staging origin). */
  appUrl: string;
}

const PALETTE = {
  ink:    '#0A0A0A',
  paper:  '#FFFFFF',
  cream:  '#F7F2E8',
  muted:  '#6B6B6B',
};

export default function MagicLinkEmail({ magicLink, appUrl }: MagicLinkEmailProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Dein Login-Link für Eat This — tipp drauf, du bist drin.</Preview>

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
        <Container
          style={{
            margin:   '0 auto',
            padding:  '40px 16px 48px',
            maxWidth: '560px',
          }}
        >
          {/* HEADER — wordmark + slogan */}
          <Section style={{ textAlign: 'center', paddingBottom: '4px' }}>
            <Img
              src={`${appUrl}/pics/eat-this-logo.webp`}
              alt="Eat This"
              width="150"
              style={{ display: 'block', margin: '0 auto 14px', maxWidth: '46%', height: 'auto' }}
            />
            <Img
              src={`${appUrl}/pics/slogan.webp`}
              alt="We tell you what to eat."
              width="300"
              style={{ display: 'block', margin: '0 auto', maxWidth: '80%', height: 'auto' }}
            />
          </Section>

          {/* HERO — starter pack */}
          <Section style={{ textAlign: 'center', padding: '26px 0 4px' }}>
            <Img
              src={`${appUrl}/pics/booster/booster_free.webp`}
              alt="Eat This Starter Pack"
              width="260"
              style={{
                display:      'block',
                margin:       '0 auto',
                borderRadius: '12px',
                maxWidth:     '66%',
                height:       'auto',
              }}
            />
          </Section>

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
              Dein Login-Link.
            </Heading>

            <Text
              style={{
                margin:     '0 0 28px',
                fontSize:   '16px',
                lineHeight: 1.55,
                color:      PALETTE.muted,
              }}
            >
              Tipp auf den Button — du landest direkt drin.
            </Text>

            {/* CTA Button — table-based for max email-client compatibility */}
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
                      backgroundColor: PALETTE.ink,
                      borderRadius:    '999px',
                    }}
                  >
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

            <Text
              style={{
                margin:     '24px 0 0',
                fontSize:   '13px',
                lineHeight: 1.5,
                color:      PALETTE.muted,
              }}
            >
              Der Link ist 1 Stunde gültig und nur für deine E-Mail-Adresse bestimmt.
            </Text>
          </Section>

          {/* FOOTER */}
          <Section style={{ padding: '20px 16px 0', textAlign: 'center' }}>
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
