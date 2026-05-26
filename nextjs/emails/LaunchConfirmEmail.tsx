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
} from '@react-email/components'

export interface LaunchConfirmEmailProps {
  /** Absolute URL the user clicks to confirm — points to /launch-confirm?token=... */
  confirmLink: string
  /** Absolute base URL for image assets (https://www.eatthisdot.com or http://localhost:3000). */
  appUrl: string
  /** 'de' or 'en' — selects copy. */
  locale: 'de' | 'en'
}

const PALETTE = {
  ink:    '#0A0A0A',
  paper:  '#FDFDFD',
  yellow: '#FEC802',
  coral:  '#A02814',
  muted:  '#6B6B6B',
}

const COPY = {
  de: {
    preview: 'Bestätige deine E-Mail — dann bist du beim Launch dabei.',
    eyebrow: 'EAT THIS · BERLIN',
    heading: 'Fast geschafft.',
    body:    'Bestätige deine E-Mail-Adresse und du bist auf der Liste. Sobald die Map aufmacht, bist du als Erstes drin.',
    cta:     'E-Mail bestätigen',
    note:    'Der Link ist 7 Tage gültig.',
    footerWhy: 'Du erhältst diese Mail, weil du dich bei',
    footerWhyAfter: 'für den Launch eingetragen hast.',
    footerIgnore: 'Nicht angefordert? Ignoriere diese Mail einfach — ohne Bestätigung kommt nichts weiter von uns.',
  },
  en: {
    preview: 'Confirm your email — and you are in for the launch.',
    eyebrow: 'EAT THIS · BERLIN',
    heading: 'Almost there.',
    body:    'Confirm your email address and you are on the list. The day the map opens, you are first in.',
    cta:     'Confirm email',
    note:    'The link is valid for 7 days.',
    footerWhy: 'You are getting this email because you signed up for the launch at',
    footerWhyAfter: '.',
    footerIgnore: 'Didn’t sign up? Just ignore this email — without the confirmation we won’t send you anything else.',
  },
} as const

export default function LaunchConfirmEmail({
  confirmLink,
  appUrl,
  locale,
}: LaunchConfirmEmailProps) {
  const t = COPY[locale]
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.preview}</Preview>

      <Body
        style={{
          margin:               0,
          padding:              0,
          backgroundColor:      PALETTE.paper,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          color:                PALETTE.ink,
          WebkitTextSizeAdjust: '100%',
        }}
      >
        <Container
          style={{
            margin:   '0 auto',
            padding:  '40px 16px 48px',
            maxWidth: '520px',
          }}
        >
          {/* Brand stamp — small yellow wordmark up top */}
          <Section style={{ textAlign: 'center', paddingBottom: '24px' }}>
            <Img
              src={`${appUrl}/pics/launch-banner.webp`}
              alt="Eat This"
              width="140"
              style={{
                display:  'block',
                margin:   '0 auto',
                height:   'auto',
              }}
            />
          </Section>

          <Section
            style={{
              backgroundColor: PALETTE.paper,
              border:          `3px solid ${PALETTE.ink}`,
              padding:         '36px 28px 32px',
              textAlign:       'center',
              boxShadow:       `6px 6px 0 0 ${PALETTE.ink}`,
            }}
          >
            <Text
              style={{
                margin:        '0 0 14px',
                fontSize:      '11px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                fontWeight:    700,
                color:         PALETTE.ink,
              }}
            >
              {t.eyebrow}
            </Text>

            <Heading
              as="h1"
              style={{
                margin:        '0 0 14px',
                fontSize:      '32px',
                lineHeight:    1.05,
                fontWeight:    800,
                color:         PALETTE.ink,
                letterSpacing: '-0.01em',
              }}
            >
              {t.heading}
            </Heading>

            <Text
              style={{
                margin:     '0 0 28px',
                fontSize:   '15px',
                lineHeight: 1.55,
                color:      PALETTE.ink,
              }}
            >
              {t.body}
            </Text>

            {/* Sticker CTA — black border + hard-offset shadow, matches the
                launch page form pill */}
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
                      border:          `3px solid ${PALETTE.ink}`,
                    }}
                  >
                    <Link
                      href={confirmLink}
                      style={{
                        display:        'inline-block',
                        padding:        '14px 28px',
                        color:          PALETTE.ink,
                        fontSize:       '16px',
                        fontWeight:     800,
                        letterSpacing:  '0.04em',
                        textTransform:  'uppercase',
                        textDecoration: 'none',
                      }}
                    >
                      {t.cta} →
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>

            <Text
              style={{
                margin:     '22px 0 0',
                fontSize:   '12px',
                lineHeight: 1.5,
                color:      PALETTE.muted,
              }}
            >
              {t.note}
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ padding: '24px 4px 0', textAlign: 'center' }}>
            <Text
              style={{
                margin:     '0 0 8px',
                fontSize:   '12px',
                lineHeight: 1.5,
                color:      PALETTE.muted,
              }}
            >
              {t.footerWhy}{' '}
              <Link href={appUrl} style={{ color: PALETTE.ink, textDecoration: 'underline' }}>
                eatthisdot.com
              </Link>
              {t.footerWhyAfter}
            </Text>
            <Text
              style={{
                margin:     0,
                fontSize:   '12px',
                lineHeight: 1.5,
                color:      PALETTE.muted,
              }}
            >
              {t.footerIgnore}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
