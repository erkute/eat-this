// Gemeinsamer heller Rahmen beider Auth-Mails, ohne dekorative Trennlinien.

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
import { BODY_FONT, COLOR, LAYOUT } from '../theme';
import type { MailLocale } from '../locale';

interface ShellProps {
  /** Inbox preview line — the sentence under the subject. */
  preview: string;
  appUrl: string;
  locale: MailLocale;
  children: React.ReactNode;
}

/** Ruhiger, lesbarer Fließtext auf hellem Papier. */
const FOOTER_MUTED = COLOR.muted;

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
    copyright: ART.footerCopyright,
    reason: 'Du hast keine Anmeldung angefordert? Dann kannst du diese E-Mail ignorieren.',
  },
  en: {
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
        {/* Die Mail nutzt eine feste helle Palette. Die App selbst unterstützt
            beide Themes; Mail-Clients bestimmen ihren Dunkelmodus unabhängig davon. */}
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
          {/* Durchgehende Folie mit Wortmarke und Must-Eat-Karte. */}
          <Link href={appUrl} style={{display: 'block'}}>
            <FooterArt art={ART.masthead} appUrl={appUrl} />
          </Link>

          {children}

          {/* FOOTER — wie SiteFooter: große Wortmarke, kleiner Claim, Instagram-Symbol,
              rechtliche Links und Copyright auf demselben Papier. Alles in der
              Markenschrift, also als Bild; nur der Satz, warum diese Mail
              kommt, bleibt echter Text. */}
          <Section
            style={{
              backgroundColor: COLOR.surface,
              padding: '32px 0 0',
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
            <Link href={appUrl} style={{display: 'block'}}>
              <FooterArt art={ART.footerBrand} appUrl={appUrl} />
            </Link>
            <Link href={INSTAGRAM} style={{display: 'block'}}>
              <FooterArt art={ART.footerInstagram} appUrl={appUrl} />
            </Link>
            {[FOOTER_LINKS[locale].slice(0, 2), FOOTER_LINKS[locale].slice(2)].map((row, r) => (
              <table key={r} role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{borderCollapse: 'collapse', tableLayout: 'fixed'}}>
                <tbody><tr>{row.map(({art, path}) => (
                  <td key={art.id} width={`${100 / row.length}%`} style={{padding: 0}}>
                    <Link href={`${appUrl}${path}`} style={{display: 'block'}}><FooterArt art={art} appUrl={appUrl} /></Link>
                  </td>
                ))}</tr></tbody>
              </table>
            ))}
            <FooterArt art={footer.copyright} appUrl={appUrl} />
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
}: {
  art: ArtAsset;
  appUrl: string;
}) {
  return (
    <Img
      src={`${appUrl}/pics/email/${art.id}.png?v=${art.version}`}
      alt={art.alt}
      width={art.width}
      style={{
        display: 'block',
        verticalAlign: 'middle',
        margin: 0,
        height: 'auto',
        width: '100%',
        maxWidth: '100%',
        border: 0,
        ...FOOTER_ALT,
      }}
    />
  );
}
