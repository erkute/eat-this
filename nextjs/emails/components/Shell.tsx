// The frame both auth mails share: ink masthead, white paper, ink footer —
// the site's own chrome, in an inbox. Home stays the source of truth (see
// emails/theme.ts); this is the part of it that survives an email client.

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
import { ART } from '../art.generated';
import { BODY_FONT, COLOR, LAYOUT } from '../theme';

interface ShellProps {
  /** Inbox preview line — the sentence under the subject. */
  preview: string;
  appUrl: string;
  children: React.ReactNode;
}

/** White at ~64% over ink — the footer's muted tone, as a solid hex. */
const FOOTER_MUTED = '#a6a09a';

const FOOTER_LINKS: { label: string; path: string }[] = [
  { label: 'Impressum', path: '/impressum' },
  { label: 'Datenschutz', path: '/datenschutz' },
  { label: 'AGB', path: '/agb' },
];

export function Shell({ preview, appUrl, children }: ShellProps) {
  return (
    <Html lang="de">
      <Head>
        {/* The app is light-only (CLAUDE.md). Without these, Apple Mail and
            Outlook auto-invert the palette and the yellow accent turns muddy. */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <style
          // Only padding and type scale — no property the Gmail sanitiser
          // strips, so the mail degrades to the desktop values, never to a
          // broken layout.
          dangerouslySetInnerHTML={{
            __html: `
:root { color-scheme: light only; supported-color-schemes: light only; }
@media only screen and (max-width: 600px) {
  .et-pad { padding-left: ${LAYOUT.padXMobile}px !important; padding-right: ${LAYOUT.padXMobile}px !important; }
  .et-cta { font-size: 16px !important; }
}
`,
          }}
        />
      </Head>
      <Preview>{preview}</Preview>

      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: COLOR.quiet,
          fontFamily: BODY_FONT,
          color: COLOR.ink,
          WebkitTextSizeAdjust: '100%',
        }}
      >
        <Container
          style={{
            margin: '0 auto',
            padding: 0,
            maxWidth: `${LAYOUT.width}px`,
            backgroundColor: COLOR.paper,
          }}
        >
          {/* MASTHEAD — the site's black bar. The wordmark PNG is cream with an
              ink outline, so it reads on ink exactly as it does in the header.
              PNG, not WebP: Gmail's proxy flattens WebP alpha and Outlook
              can't decode it at all. */}
          <Section style={{ backgroundColor: COLOR.ink, padding: '18px 0', textAlign: 'center' }}>
            <Link href={appUrl}>
              <Img
                src={`${appUrl}/pics/email/eat-this-logo.png`}
                alt="Eat This"
                width="122"
                style={{
                  display: 'block',
                  margin: '0 auto',
                  height: 'auto',
                  border: 0,
                  // Alt-Text erbt Farbe und Schnitt vom img. Ohne das steht er
                  // bei blockierten Bildern schwarz auf der Ink-Fläche.
                  color: COLOR.inverse,
                  fontSize: '20px',
                  fontWeight: 700,
                }}
              />
            </Link>
          </Section>

          {children}

          {/* FOOTER — ink block, cream wordmark, one yellow accent. Same shape
              as SiteFooter on every route since 21.08.2026. */}
          <Section
            style={{ backgroundColor: COLOR.ink, padding: '34px 24px 30px', textAlign: 'center' }}
          >
            <Img
              src={`${appUrl}/pics/email/eat-this-logo.png`}
              alt="Eat This"
              width="150"
              style={{
                display: 'block',
                margin: '0 auto 12px',
                height: 'auto',
                border: 0,
                color: COLOR.inverse,
                fontSize: '22px',
                fontWeight: 700,
              }}
            />
            <Img
              src={`${appUrl}/pics/email/${ART.sloganInverse.id}.png`}
              alt={ART.sloganInverse.alt}
              width={ART.sloganInverse.width}
              style={{
                display: 'block',
                margin: '0 auto 26px',
                height: 'auto',
                border: 0,
                color: COLOR.inverse,
                fontSize: '11px',
                letterSpacing: '0.16em',
              }}
            />

            <Text
              style={{
                margin: '0 0 14px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: COLOR.inverse,
              }}
            >
              {FOOTER_LINKS.map((l, i) => (
                <span key={l.path}>
                  {i > 0 && <span style={{ color: FOOTER_MUTED }}>{'  ·  '}</span>}
                  <Link
                    href={`${appUrl}${l.path}`}
                    style={{ color: COLOR.inverse, textDecoration: 'none' }}
                  >
                    {l.label}
                  </Link>
                </span>
              ))}
            </Text>

            <Text
              style={{ margin: '0 0 6px', fontSize: '12px', lineHeight: 1.6, color: FOOTER_MUTED }}
            >
              Du bekommst diese E-Mail, weil sich jemand mit dieser Adresse bei{' '}
              <Link href={appUrl} style={{ color: COLOR.accent, textDecoration: 'none' }}>
                eatthisdot.com
              </Link>{' '}
              angemeldet hat. Warst du das nicht, ignoriere sie einfach.
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: FOOTER_MUTED,
              }}
            >
              © 2026 Eat This. Alle Rechte vorbehalten.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
