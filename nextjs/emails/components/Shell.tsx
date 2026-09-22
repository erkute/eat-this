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
import { BODY_FONT, COLOR, LAYOUT, EMAIL_ASSET_VERSION } from '../theme';
import type { MailLocale } from '../locale';

interface ShellProps {
  /** Inbox preview line — the sentence under the subject. */
  preview: string;
  appUrl: string;
  locale: MailLocale;
  children: React.ReactNode;
}

/** White at ~64% over ink — the footer's muted tone, as a solid hex. */
const FOOTER_MUTED = '#a6a09a';

// Instagram steht auch im Website-Footer und ist der einzige Kanal dort, der
// in einer Mail ueberhaupt funktioniert: "Frag Remy" ist ein Anker auf die
// Startseite, die Cookie-Einstellungen sind ein JS-Button. Beide bleiben
// draussen, dieser eine gehoert rein.
// Die EN-Beschriftung folgt dem EN-Footer der Seite (footer.* in
// lib/i18n/translations.ts): „Impressum" bleibt dort Impressum.
const FOOTER_LINKS: Record<MailLocale, { label: string; path?: string; url?: string }[]> = {
  de: [
    { label: 'Instagram', url: 'https://www.instagram.com/eatthisdotcom/' },
    { label: 'Impressum', path: '/impressum' },
    { label: 'Datenschutz', path: '/datenschutz' },
    { label: 'AGB', path: '/agb' },
  ],
  en: [
    { label: 'Instagram', url: 'https://www.instagram.com/eatthisdotcom/' },
    { label: 'Impressum', path: '/en/impressum' },
    { label: 'Privacy', path: '/en/datenschutz' },
    { label: 'Terms', path: '/en/agb' },
  ],
};

const FOOTER_COPY = {
  de: {
    reasonBefore: 'Du bekommst diese E-Mail, weil sich jemand mit dieser Adresse bei',
    reasonAfter: 'angemeldet hat. Warst du das nicht, ignoriere sie einfach.',
    copyright: '© 2026 Eat This. Alle Rechte vorbehalten.',
  },
  en: {
    reasonBefore: 'You’re getting this email because someone signed in to',
    reasonAfter: 'with this address. If that wasn’t you, just ignore it.',
    copyright: '© 2026 Eat This. All rights reserved.',
  },
} as const;

export function Shell({ preview, appUrl, locale, children }: ShellProps) {
  const footer = FOOTER_COPY[locale];
  return (
    <Html lang={locale}>
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
          backgroundColor: COLOR.surface,
          fontFamily: BODY_FONT,
          color: COLOR.text,
          WebkitTextSizeAdjust: '100%',
        }}
      >
        <Container
          style={{
            margin: '0 auto',
            padding: 0,
            maxWidth: `${LAYOUT.width}px`,
            backgroundColor: COLOR.surface,
          }}
        >
          {/* MASTHEAD — the site's black bar. The wordmark PNG is cream with an
              ink outline, so it reads on ink exactly as it does in the header.
              PNG, not WebP: Gmail's proxy flattens WebP alpha and Outlook
              can't decode it at all. */}
          <Section
            style={{ backgroundColor: COLOR.surface, padding: '18px 0', textAlign: 'center' }}
          >
            <Link href={appUrl}>
              <Img
                src={`${appUrl}/pics/email/eat-this-logo.png?v=${EMAIL_ASSET_VERSION}`}
                alt="Eat This"
                width="122"
                style={{
                  display: 'block',
                  margin: '0 auto',
                  height: 'auto',
                  border: 0,
                  // Alt-Text erbt Farbe und Schnitt vom img. Ohne das steht er
                  // bei blockierten Bildern schwarz auf der Ink-Fläche.
                  color: COLOR.text,
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
            style={{
              backgroundColor: COLOR.surface,
              padding: '34px 24px 30px',
              textAlign: 'center',
            }}
          >
            <Img
              src={`${appUrl}/pics/email/eat-this-logo.png?v=${EMAIL_ASSET_VERSION}`}
              alt="Eat This"
              width="150"
              style={{
                display: 'block',
                margin: '0 auto 12px',
                height: 'auto',
                border: 0,
                color: COLOR.text,
                fontSize: '22px',
                fontWeight: 700,
              }}
            />
            <Img
              src={`${appUrl}/pics/email/${ART.sloganInverse.id}.png?v=${ART.sloganInverse.version}`}
              alt={ART.sloganInverse.alt}
              width={ART.sloganInverse.width}
              style={{
                display: 'block',
                margin: '0 auto 26px',
                height: 'auto',
                border: 0,
                color: COLOR.text,
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
                color: COLOR.text,
              }}
            >
              {FOOTER_LINKS[locale].map((l, i) => (
                <span key={l.label}>
                  {i > 0 && <span style={{ color: FOOTER_MUTED }}>{'  ·  '}</span>}
                  <Link
                    href={l.url ?? `${appUrl}${l.path}`}
                    style={{ color: COLOR.text, textDecoration: 'none' }}
                  >
                    {l.label}
                  </Link>
                </span>
              ))}
            </Text>

            <Text
              style={{ margin: '0 0 6px', fontSize: '12px', lineHeight: 1.6, color: FOOTER_MUTED }}
            >
              {footer.reasonBefore}{' '}
              <Link href={appUrl} style={{ color: COLOR.accent, textDecoration: 'none' }}>
                eatthisdot.com
              </Link>{' '}
              {footer.reasonAfter}
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
              {footer.copyright}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
