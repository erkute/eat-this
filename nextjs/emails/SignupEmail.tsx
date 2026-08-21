// Signup mail — first contact with an address that has no account yet.
//
// Carries the product where the login mail does not: the home hero, the Starter
// Pack panel in its home shape (quiet grey, yellow pill, red title), and a few
// composed spot cards. The link still comes first — someone who only wants in
// never has to scroll.

import { Link, Section, Text } from '@react-email/components';
import { Shell } from './components/Shell';
import {
  ArtImage,
  CtaButton,
  Fineprint,
  Lead,
  Paper,
  SectionHead,
} from './components/Pieces';
import { ART } from './art.generated';
import { PHONES_ART } from './phones.generated';
import {
  EMAIL_SPOTS,
  SPOT_DISPLAY_HEIGHT,
  SPOT_DISPLAY_WIDTH,
  type EmailSpot,
} from './spots.generated';
import { COLOR, LAYOUT, EMAIL_ASSET_VERSION } from './theme';

export type { EmailSpot };

export interface SignupEmailProps {
  /** The Firebase sign-in link the recipient clicks to authenticate. */
  magicLink: string;
  /** Absolute base URL for artwork (https://www.eatthisdot.com or http://localhost:3000). */
  appUrl: string;
  /**
   * Overrides the curated selection. Production passes nothing — the spots come
   * from `npm run build:email-spots`, which renders each card locally and drops
   * the finished JPEG into public/. Only tests inject here.
   */
  spots?: readonly EmailSpot[];
}

export const SIGNUP_SUBJECT = 'Willkommen bei Eat This — dein Link zum Anmelden';

/** Home shows four in a rail; a mail that scrolls forever converts worse. */
const MAX_SPOTS = 3;

export default function SignupEmail({ magicLink, appUrl, spots: override }: SignupEmailProps) {
  const spots = (override ?? EMAIL_SPOTS).slice(0, MAX_SPOTS);

  return (
    <Shell
      appUrl={appUrl}
      preview="Dein Link zum Anmelden — und dein Starter Pack liegt schon bereit."
    >
      {/* HERO — the home hero, one column narrower: kicker, red Providence
          headline, the site's own lead sentence, ink CTA. */}
      <Paper padding="40px 32px 36px">
        <ArtImage
          art={ART.kickerSignup}
          appUrl={appUrl}
          altStyle={{ color: COLOR.ink, fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em' }}
          style={{ margin: '0 0 14px' }}
        />

        <ArtImage
          art={ART.headlineSignup}
          appUrl={appUrl}
          altStyle={{ color: COLOR.red, fontSize: '30px', fontWeight: 700 }}
          style={{ margin: '0 0 22px' }}
        />

        <Lead style={{ marginBottom: '28px' }}>
          Die besten Orte Berlins auf einer Map — und für ausgewählte Spots sagen wir dir gleich,
          was du bestellen musst.
        </Lead>

        <CtaButton href={magicLink} label="Anmelden und Map öffnen" />

        <Fineprint>
          Der Link gilt 1 Stunde und nur für deine E-Mail-Adresse. Falls der Button nicht reagiert:{' '}
          <Link href={magicLink} style={{ color: COLOR.ink, textDecoration: 'underline' }}>
            hier ist er als normaler Link
          </Link>
          .
        </Fineprint>
      </Paper>

      {/* PHONES — auf home stehen die beiden Mockups neben der Hero-Copy,
          gekippt und ueberlappt. In einer 600px-Spalte gibt es kein Neben-,
          nur ein Darunter; und `transform` entfernt Gmail ohnehin. Deshalb
          liegt das Paar als EIN vorkomponiertes Bild bei
          (npm run build:email-phones), Kippung und Schatten eingebacken. */}
      <Section style={{ backgroundColor: COLOR.paper, padding: '0 0 8px', textAlign: 'center' }}>
        <img
          src={`${appUrl}/pics/email/${PHONES_ART.id}.jpg?v=${PHONES_ART.version}`}
          alt={PHONES_ART.alt}
          width={PHONES_ART.width}
          style={{
            display: 'block',
            border: 0,
            margin: '0 auto',
            height: 'auto',
            maxWidth: '100%',
            color: COLOR.ink,
            fontSize: '13px',
            fontWeight: 700,
          }}
        />
      </Section>

      {/* STARTER PACK — the home section, rebuilt: quiet-grey panel, booster
          artwork, yellow "Gratis" pill, red title. */}
      <Section className="et-pad" style={{ backgroundColor: COLOR.paper, padding: '0 32px 36px' }}>
        <Section
          style={{
            backgroundColor: COLOR.quiet,
            borderRadius: `${LAYOUT.radiusPhoto}px`,
            padding: '30px 24px 32px',
            textAlign: 'center',
          }}
        >
          <ArtImage
            art={{
              id: 'booster_free',
              width: 168,
              height: 260,
              alt: 'Eat This Starter Pack — 20 Must Eats',
              version: EMAIL_ASSET_VERSION,
            }}
            appUrl={appUrl}
            altStyle={{ color: COLOR.ink, fontSize: '14px', fontWeight: 700 }}
            style={{ margin: '0 auto 16px' }}
          />

          {/* The yellow pill from home — a padded inline anchor-free span reads
              as a pill in every client that keeps background colours, and as
              plain bold text in the few that don't. */}
          <Text
            style={{
              margin: '0 0 12px',
              display: 'inline-block',
              backgroundColor: COLOR.accent,
              color: COLOR.red,
              borderRadius: '999px',
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            Gratis
          </Text>

          <ArtImage
            art={ART.titleStarterPack}
            appUrl={appUrl}
            altStyle={{ color: COLOR.red, fontSize: '22px', fontWeight: 700 }}
            style={{ margin: '0 auto 14px' }}
          />

          <Text
            style={{
              margin: 0,
              fontSize: '15px',
              lineHeight: 1.6,
              color: COLOR.ink,
            }}
          >
            Melde dich an und schalte weitere Spots samt ihren Must Eats auf deiner Map frei.
            Kostenlos.
          </Text>
        </Section>
      </Section>

      {/* SPOTS — jede Karte ist EIN lokal vorgerendertes Bild (Foto + Scrim +
          Name in der Markenschrift, siehe scripts/build-email-spots.mts),
          verpackt in einen /map?r=-Deeplink. Ein flaches Bild ist die einzige
          Komposition, die kein Mail-Client zerlegen kann: Gmail entfernt
          position/transform/filter/box-shadow und lädt nie Webfonts. */}
      {spots.length > 0 && (
        <Paper padding="0 32px 40px">
          <SectionHead art={ART.titleSpots} appUrl={appUrl} />

          <Lead style={{ marginBottom: '20px', fontSize: '15px' }}>
            Drei von vielen. Tipp drauf, dann öffnet sich der Spot auf der Map.
          </Lead>

          {spots.map((s) => (
            <Link
              key={s.slug}
              href={`${appUrl}/map?r=${s.slug}`}
              style={{ display: 'block', margin: '0 0 14px' }}
            >
              {/* next/image has no meaning in an inbox — the markup leaves this
                  process as an HTML string, and there is no runtime to optimise. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${appUrl}/pics/email/spots/${s.slug}.jpg?v=${s.version}`}
                alt={`${s.name} — ${s.meta}`}
                width={SPOT_DISPLAY_WIDTH}
                height={SPOT_DISPLAY_HEIGHT}
                style={{
                  display: 'block',
                  width: '100%',
                  maxWidth: `${SPOT_DISPLAY_WIDTH}px`,
                  height: 'auto',
                  border: 0,
                  borderRadius: `${LAYOUT.radiusPhoto}px`,
                }}
              />
            </Link>
          ))}
        </Paper>
      )}
    </Shell>
  );
}
