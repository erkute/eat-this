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
  /** Absolute base URL for image assets (https://eatthisdot.com or http://localhost:3000). */
  appUrl: string;
  /** Filename of the random booster pack image (in /pics/email/). */
  boosterPack: string;
}

const PALETTE = {
  ink:    '#0A0A0A',
  paper:  '#FFFFFF',
  cream:  '#F7F2E8',
  gold:   '#E8B82A',
  muted:  '#6B6B6B',
};

export default function MagicLinkEmail({
  magicLink,
  appUrl,
  boosterPack,
}: MagicLinkEmailProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Dein Booster Pack wartet — 10 zufällige Must Eat Cards für dich.</Preview>

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
            margin:          '0 auto',
            padding:         '32px 16px 48px',
            maxWidth:        '560px',
          }}
        >
          {/* HEADER — black band: wordmark + stats + tagline */}
          <Section
            style={{
              backgroundColor: PALETTE.ink,
              borderRadius:    '20px',
              padding:         '30px 24px 26px',
              textAlign:       'center',
            }}
          >
            <Img
              src={`${appUrl}/pics/email/logo2-white.png`}
              alt="Eat This"
              width="180"
              style={{
                display:  'block',
                margin:   '0 auto 18px',
                maxWidth: '50%',
                height:   'auto',
              }}
            />
            <Text
              style={{
                margin:        0,
                color:         PALETTE.gold,
                fontSize:      '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight:    700,
                whiteSpace:    'nowrap',
              }}
            >
              Berlin · 150+ Must Eats · 200+ Restaurants
            </Text>
          </Section>

          {/* HERO — random booster pack + reveal copy */}
          <Section
            style={{
              backgroundColor: PALETTE.paper,
              borderRadius:    '20px',
              padding:         '40px 28px 32px',
              marginTop:       '16px',
              textAlign:       'center',
            }}
          >
            <Img
              src={`${appUrl}/pics/email/${boosterPack}`}
              alt="Dein Eat This Booster Pack"
              width="280"
              style={{
                display:      'block',
                margin:       '0 auto 28px',
                borderRadius: '12px',
                maxWidth:     '70%',
                height:       'auto',
              }}
            />

            <Heading
              as="h1"
              style={{
                margin:        '0 0 12px',
                fontSize:      '28px',
                lineHeight:    1.2,
                fontWeight:    800,
                color:         PALETTE.ink,
                letterSpacing: '-0.01em',
              }}
            >
              Dein Booster Pack wartet.
            </Heading>

            <Text
              style={{
                margin:     '0 0 28px',
                fontSize:   '16px',
                lineHeight: 1.55,
                color:      PALETTE.muted,
              }}
            >
              10 zufällige Must Eat Cards — dein persönlicher Start-Stack
              aus echten Restaurant-Empfehlungen, die du nirgends sonst findest.
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
                        padding:        '16px 36px',
                        color:          PALETTE.paper,
                        fontSize:       '16px',
                        fontWeight:     700,
                        letterSpacing:  '0.02em',
                        textDecoration: 'none',
                      }}
                    >
                      Bestätigen &amp; Pack öffnen
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

          {/* WHAT'S NEXT — 3 steps */}
          <Section
            style={{
              backgroundColor: PALETTE.paper,
              borderRadius:    '20px',
              padding:         '32px 28px',
              marginTop:       '16px',
            }}
          >
            <Heading
              as="h2"
              style={{
                margin:        '0 0 20px',
                fontSize:      '13px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight:    700,
                color:         PALETTE.muted,
              }}
            >
              So geht&apos;s weiter
            </Heading>

            {[
              { n: '1', t: 'Klick den Button.', d: 'Du landest direkt in deinem Profil.' },
              { n: '2', t: 'Sag uns deinen Namen.', d: 'Dauert 5 Sekunden.' },
              { n: '3', t: 'Pack öffnen.', d: 'Deine 10 Karten werden enthüllt.' },
            ].map((step) => (
              <table
                key={step.n}
                role="presentation"
                cellPadding={0}
                cellSpacing={0}
                border={0}
                width="100%"
                style={{ marginBottom: '14px' }}
              >
                <tbody>
                  <tr>
                    <td
                      width="36"
                      valign="top"
                      style={{ paddingRight: '12px' }}
                    >
                      <div
                        style={{
                          width:           '28px',
                          height:          '28px',
                          borderRadius:    '50%',
                          backgroundColor: PALETTE.gold,
                          color:           PALETTE.ink,
                          fontSize:        '13px',
                          fontWeight:      800,
                          lineHeight:      '28px',
                          textAlign:       'center',
                        }}
                      >
                        {step.n}
                      </div>
                    </td>
                    <td valign="top">
                      <Text
                        style={{
                          margin:     0,
                          fontSize:   '15px',
                          lineHeight: 1.45,
                          fontWeight: 700,
                          color:      PALETTE.ink,
                        }}
                      >
                        {step.t}
                      </Text>
                      <Text
                        style={{
                          margin:     '2px 0 0',
                          fontSize:   '14px',
                          lineHeight: 1.45,
                          color:      PALETTE.muted,
                        }}
                      >
                        {step.d}
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            ))}
          </Section>

          {/* PIXEL ART CHARACTER ROW — playful accent */}
          <Section
            style={{
              padding:    '28px 16px 8px',
              textAlign:  'center',
            }}
          >
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
                  <td style={{ padding: '0 14px' }}>
                    <Img
                      src={`${appUrl}/pics/email/char1.png`}
                      alt=""
                      width="64"
                      height="80"
                      style={{ display: 'block', imageRendering: 'pixelated' }}
                    />
                  </td>
                  <td style={{ padding: '0 14px' }}>
                    <Img
                      src={`${appUrl}/pics/email/char2.png`}
                      alt=""
                      width="64"
                      height="80"
                      style={{ display: 'block', imageRendering: 'pixelated' }}
                    />
                  </td>
                  <td style={{ padding: '0 14px' }}>
                    <Img
                      src={`${appUrl}/pics/email/char3.png`}
                      alt=""
                      width="64"
                      height="80"
                      style={{ display: 'block', imageRendering: 'pixelated' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <Text
              style={{
                margin:     '14px 0 0',
                fontSize:   '13px',
                lineHeight: 1.4,
                color:      PALETTE.muted,
                fontStyle:  'italic',
              }}
            >
              Die Crew freut sich auf dich.
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
              Du erhältst diese E-Mail, weil du dich bei{' '}
              <Link href={appUrl} style={{ color: PALETTE.ink, textDecoration: 'underline' }}>
                eatthisdot.com
              </Link>{' '}
              registriert hast.
            </Text>
            <Text
              style={{
                margin:     0,
                fontSize:   '12px',
                lineHeight: 1.5,
                color:      PALETTE.muted,
              }}
            >
              Hast du den Link nicht angefordert? Dann ignoriere diese E-Mail einfach.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
