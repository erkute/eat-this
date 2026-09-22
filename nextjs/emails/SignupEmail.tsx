// Signup mail — first contact with an address that has no account yet.
//
// Carries the product where the login mail does not: the home claim, the
// Starter Pack panel from the tour, and a few composed spot cards. The link
// still comes first — someone who only wants in never has to scroll.

import { Link, Section } from '@react-email/components';
import { Shell } from './components/Shell';
import { ArtImage, CtaButton, Fineprint, Paper } from './components/Pieces';
import { ART } from './art.generated';
import { EMAIL_SPOTS, SPOT_DISPLAY_WIDTH, type EmailSpot } from './spots.generated';
import { COLOR, LAYOUT, EMAIL_ASSET_VERSION } from './theme';
import type { MailLocale } from './locale';

export type { EmailSpot };

export interface SignupEmailProps {
  /** The Firebase sign-in link the recipient clicks to authenticate. */
  magicLink: string;
  /** Absolute base URL for artwork (https://www.eatthisdot.com or http://localhost:3000). */
  appUrl: string;
  locale: MailLocale;
  /**
   * Overrides the curated selection. Production passes nothing — the spots come
   * from `npm run build:email-spots`, which renders each card locally and drops
   * the finished JPEG into public/. Only tests inject here.
   */
  spots?: readonly EmailSpot[];
}

export const SIGNUP_SUBJECT: Record<MailLocale, string> = {
  de: 'Dein Anmeldelink für Eat This',
  en: 'Your Eat This sign-in link',
};

/* Wortlaut vom Betreiber (22.09.2026): statt „Gute Spots findest du überall"
   — das machte die eigene Auswahl kleiner, als sie ist — das konkretere
   Versprechen: nicht nur wohin, sondern was bestellen. Die Absätze stehen in
   emails/art.generated.ts, weil sie als Bild in der Markenschrift gesetzt
   sind (scripts/build-email-art.mts); hier liegt nur, was echter Text bleibt. */
const COPY = {
  de: {
    preview: '20 Must Eats für deinen Start in Berlin.',
    kicker: ART.kickerSignup,
    lead: ART.leadSignup,
    cta: ART.ctaAnmelden,
    fineprint:
      'Dein Anmeldelink ist eine Stunde gültig und gilt nur für deine E-Mail-Adresse. Der Button funktioniert nicht?',
    plainLink: 'Anmeldelink öffnen',
    starterKicker: ART.kickerStarter,
    starterTitle: ART.titleStarter,
    starterBody: ART.bodyStarter,
  },
  en: {
    preview: '20 Must Eats to get you started in Berlin.',
    kicker: ART.kickerSignupEn,
    lead: ART.leadSignupEn,
    cta: ART.ctaSignUp,
    fineprint:
      'Your sign-in link is valid for one hour and only works for your email address. Button not working?',
    plainLink: 'Open sign-in link',
    starterKicker: ART.kickerStarterEn,
    starterTitle: ART.titleStarterEn,
    starterBody: ART.bodyStarterEn,
  },
} as const;

/** Home shows four in a rail; a mail that scrolls forever converts worse. */
const MAX_SPOTS = 3;

export default function SignupEmail({
  magicLink,
  appUrl,
  locale,
  spots: override,
}: SignupEmailProps) {
  const spots = (override ?? EMAIL_SPOTS).slice(0, MAX_SPOTS);
  const copy = COPY[locale];

  return (
    <Shell appUrl={appUrl} locale={locale} preview={copy.preview}>
      {/* HERO — Kicker, Claim, der Satz, was Eat This ist, der Knopf. Der
          Knopf ist die einzige Hauptaktion; alles darunter macht Lust, soll
          ihn aber nicht zwischen Bildern verstecken. */}
      <Paper padding="40px 32px 40px">
        <ArtImage
          art={copy.kicker}
          appUrl={appUrl}
          altStyle={{
            color: COLOR.accent,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.16em',
          }}
          style={{ margin: '0 auto 14px' }}
        />

        <ArtImage
          art={ART.headlineSignup}
          appUrl={appUrl}
          altStyle={{ color: COLOR.text, fontSize: '30px', fontWeight: 700 }}
          style={{ margin: '0 auto 18px' }}
        />

        <ArtImage
          art={copy.lead}
          appUrl={appUrl}
          altStyle={{ color: COLOR.text, fontSize: '16px' }}
          style={{ margin: '0 auto 26px' }}
        />

        <CtaButton href={magicLink} art={copy.cta} appUrl={appUrl} />

        <Fineprint>
          {copy.fineprint}{' '}
          <Link href={magicLink} style={{ color: COLOR.text, textDecoration: 'underline' }}>
            {copy.plainLink}
          </Link>
          .
        </Fineprint>
      </Paper>

      {/* STARTER PACK — die Tafel aus der Tour: Pack, Kicker, Titel, Satz.
          Bis 22.09.2026 stand davor noch das Bild mit den zwei Telefonen;
          zwei grosse Bilder hintereinander wirkten wie ein Stapel Anhaenge
          (Betreiber). Die Spots darunter zeigen die Map ohnehin. */}
      <Section
        className="et-pad"
        style={{ backgroundColor: COLOR.surface, padding: '0 32px 36px' }}
      >
        <Section
          style={{
            backgroundColor: COLOR.raised,
            borderRadius: `${LAYOUT.radiusPhoto}px`,
            padding: '30px 20px 30px',
            textAlign: 'center',
          }}
        >
          <ArtImage
            art={{
              id: 'booster_free',
              width: 150,
              height: 232,
              alt: 'Eat This Starter Pack',
              version: EMAIL_ASSET_VERSION,
            }}
            appUrl={appUrl}
            altStyle={{ color: COLOR.text, fontSize: '14px', fontWeight: 700 }}
            style={{ margin: '0 auto 18px' }}
          />
          <ArtImage
            art={copy.starterKicker}
            appUrl={appUrl}
            altStyle={{ color: COLOR.accent, fontSize: '11px', fontWeight: 700 }}
            style={{ margin: '0 auto 8px' }}
          />
          <ArtImage
            art={copy.starterTitle}
            appUrl={appUrl}
            altStyle={{ color: COLOR.text, fontSize: '22px', fontWeight: 700 }}
            style={{ margin: '0 auto 12px' }}
          />
          <ArtImage
            art={copy.starterBody}
            appUrl={appUrl}
            altStyle={{ color: COLOR.text, fontSize: '15px' }}
            style={{ margin: '0 auto' }}
          />
        </Section>
      </Section>

      {/* SPOTS — jede Karte ist EIN lokal vorgerendertes Bild (Foto + Scrim +
          Name in der Markenschrift, siehe scripts/build-email-spots.mts),
          verpackt in einen /map?r=-Deeplink. Die Must-Eat-Karte ist mit
          eingebacken, nur Karten aus dem öffentlichen Schaufenster. Ein flaches Bild ist die einzige
          Komposition, die kein Mail-Client zerlegen kann: Gmail entfernt
          position/transform/filter/box-shadow und lädt nie Webfonts. */}
      {spots.length > 0 && (
        <Paper padding="0 32px 40px">
          {/* Ohne Überschrift (Betreiber, 22.09.2026): es sind Beispiele,
              keine „ersten Spots". Jede Karte zeigt den Spot mit seiner
              offenen Must-Eat-Karte daneben — dass beides zusammengehört,
              soll man sehen, nicht lesen. */}
          {spots.map((s) => (
            <Link
              key={s.slug}
              href={`${appUrl}${locale === 'en' ? '/en' : ''}/map?r=${s.slug}`}
              style={{ display: 'block', margin: '0 0 14px' }}
            >
              {/* next/image has no meaning in an inbox — the markup leaves this
                  process as an HTML string, and there is no runtime to optimise.
                  Nur `width`, kein `height`: bei blockierten Bildern hielt das
                  height-Attribut drei leere ~400-px-Boxen offen. Die Höhe folgt
                  geladen aus dem Seitenverhältnis — auch in Outlooks Word-Engine,
                  die CSS-Breiten ignoriert, aber das width-Attribut skaliert. */}
              <img
                src={`${appUrl}/pics/email/spots/${s.slug}.jpg?v=${s.version}`}
                alt={`${s.name} — ${s.meta}`}
                width={SPOT_DISPLAY_WIDTH}
                style={{
                  display: 'block',
                  width: '100%',
                  maxWidth: `${SPOT_DISPLAY_WIDTH}px`,
                  height: 'auto',
                  border: 0,
                  borderRadius: `${LAYOUT.radiusPhoto}px`,
                  /* Auch die Foto-Karten brauchen eine eigene Alt-Farbe: sie
                     stecken in einem <Link>, und ein blockiertes Bild erbt
                     dessen Standard-Blau. Auf weissem Papier ging das gerade
                     noch durch, auf Ink ist es unlesbar. */
                  color: COLOR.text,
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              />
            </Link>
          ))}
        </Paper>
      )}
    </Shell>
  );
}
