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
import { ART, type ArtAsset } from '../art.generated';
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

/* Die Links des Website-Footers, in derselben Reihenfolge und Schrift — als
   Bilder, weil Gmail keine Webfonts laedt. Die Cookie-Einstellungen sind dort
   ein JS-Knopf und fehlen hier; "Frag Remy" ist ein Anker auf die Startseite. */
const FOOTER_LINKS: Record<MailLocale, { art: ArtAsset; path: string }[]> = {
  de: [
    { art: ART.footerAbout, path: '/about' },
    { art: ART.footerContact, path: '/contact' },
    { art: ART.footerImpressum, path: '/impressum' },
    { art: ART.footerDatenschutz, path: '/datenschutz' },
    { art: ART.footerAgb, path: '/agb' },
  ],
  en: [
    { art: ART.footerAboutEn, path: '/en/about' },
    { art: ART.footerContactEn, path: '/en/contact' },
    { art: ART.footerImpressum, path: '/en/impressum' },
    { art: ART.footerDatenschutzEn, path: '/en/datenschutz' },
    { art: ART.footerAgbEn, path: '/en/agb' },
  ],
};

const FOOTER_COPY = {
  de: {
    follow: ART.footerFollow,
    copyright: ART.footerCopyright,
    reason: 'Du hast keine Anmeldung angefordert? Dann kannst du diese E-Mail ignorieren.',
  },
  en: {
    follow: ART.footerFollowEn,
    copyright: ART.footerCopyrightEn,
    reason: 'Didn’t request a sign-in? Then you can ignore this email.',
  },
} as const;

const INSTAGRAM = 'https://www.instagram.com/eatthisdotcom/';

/** Alt-Text einer Footer-Grafik bei blockierten Bildern: weiss, fett, klein. */
const FOOTER_ALT = { color: COLOR.text, fontSize: '12px', fontWeight: 700 } as const;

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

          {/* FOOTER — wie SiteFooter: Wortmarke, Claim, „Folgen" gelb über
              INSTAGRAM, die Links in einer Reihe, Copyright. Alles in der
              Markenschrift, also als Bild; nur der Satz, warum diese Mail
              kommt, bleibt echter Text. */}
          <Section
            style={{
              backgroundColor: COLOR.surface,
              padding: '40px 24px 32px',
              textAlign: 'center',
            }}
          >
            <Text
              className="et-pad"
              style={{
                margin: '0 0 34px',
                fontSize: '13px',
                lineHeight: 1.55,
                color: FOOTER_MUTED,
              }}
            >
              {footer.reason}
            </Text>
            <Link href={appUrl}>
              <Img
                src={`${appUrl}/pics/email/eat-this-logo.png?v=${EMAIL_ASSET_VERSION}`}
                alt="Eat This"
                width="150"
                style={{
                  display: 'block',
                  margin: '0 auto 10px',
                  height: 'auto',
                  border: 0,
                  color: COLOR.text,
                  fontSize: '22px',
                  fontWeight: 700,
                }}
              />
            </Link>
            <FooterArt art={ART.sloganInverse} appUrl={appUrl} margin="0 auto 30px" />

            <FooterArt art={footer.follow} appUrl={appUrl} margin="0 auto 6px" />
            <Link href={INSTAGRAM}>
              <FooterArt art={ART.footerInstagram} appUrl={appUrl} margin="0 auto 30px" />
            </Link>

            {/* Zwei Reihen Tabellenzellen statt einer umbrechenden Zeile: die
                fünf Links sind zusammen breiter als ein Telefon, und ein
                Bild bricht nicht um. Die Abstände und die Punkte dazwischen
                hält in Tabellen jeder Client gleich. */}
            {[FOOTER_LINKS[locale].slice(0, 2), FOOTER_LINKS[locale].slice(2)].map((row, r) => (
              <table
                key={r}
                role="presentation"
                cellPadding={0}
                cellSpacing={0}
                style={{ margin: '0 auto 10px', borderCollapse: 'collapse' }}
              >
                <tbody>
                  <tr>
                    {row.map(({ art, path }, i) => (
                      <td key={art.id} style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {i > 0 && (
                          <span style={{ color: FOOTER_MUTED, fontSize: '12px', padding: '0 1px' }}>
                            ·
                          </span>
                        )}
                        <Link href={`${appUrl}${path}`} style={{ display: 'inline-block' }}>
                          <FooterArt art={art} appUrl={appUrl} inline />
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            ))}

            <FooterArt art={footer.copyright} appUrl={appUrl} margin="18px auto 0" />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Eine Footer-Zeile in der Markenschrift. Breite aus dem Manifest, keine
 *  Höhe — bei blockierten Bildern steht dann nur der Alt-Text da. */
function FooterArt({
  art,
  appUrl,
  margin,
  inline = false,
}: {
  art: ArtAsset;
  appUrl: string;
  margin?: string;
  inline?: boolean;
}) {
  return (
    <Img
      src={`${appUrl}/pics/email/${art.id}.png?v=${art.version}`}
      alt={art.alt}
      width={art.width}
      style={{
        display: inline ? 'inline-block' : 'block',
        verticalAlign: 'middle',
        margin: inline ? 0 : margin,
        height: 'auto',
        maxWidth: '100%',
        border: 0,
        ...FOOTER_ALT,
      }}
    />
  );
}
