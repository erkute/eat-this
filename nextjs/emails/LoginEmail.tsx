// Login mail — for an address that already has an account.
//
// One job: get the person back in. Everything sits above the fold, there is no
// product pitch and no restaurant artwork, so the mail renders instantly, stays
// small, and reads as transactional to spam filters. The signup mail
// (SignupEmail.tsx) is the one that sells.

import { Link } from '@react-email/components';
import { Shell } from './components/Shell';
import { ArtImage, CtaButton, Fineprint, Paper } from './components/Pieces';
import { ART } from './art.generated';
import { COLOR } from './theme';
import type { MailLocale } from './locale';

export interface LoginEmailProps {
  /** The Firebase sign-in link the recipient clicks to authenticate. */
  magicLink: string;
  /** Absolute base URL for artwork (https://www.eatthisdot.com or http://localhost:3000). */
  appUrl: string;
  locale: MailLocale;
}

export const LOGIN_SUBJECT: Record<MailLocale, string> = {
  de: 'Dein Login-Link für Eat This',
  en: 'Your Eat This sign-in link',
};

const COPY = {
  de: {
    preview: 'Ein Klick und du bist drin — dein Login-Link.',
    kicker: ART.kickerLogin,
    headline: ART.headlineLogin,
    lead: ART.leadLogin,
    cta: ART.ctaAnmelden,
    fineprint:
      'Dein Anmeldelink ist eine Stunde gültig und gilt nur für deine E-Mail-Adresse. Der Button funktioniert nicht?',
    plainLink: 'Anmeldelink öffnen',
  },
  en: {
    preview: 'One click and you’re in — your sign-in link.',
    kicker: ART.kickerLoginEn,
    headline: ART.headlineLoginEn,
    lead: ART.leadLoginEn,
    cta: ART.ctaSignIn,
    fineprint:
      'Your sign-in link is valid for one hour and only works for your email address. Button not working?',
    plainLink: 'Open sign-in link',
  },
} as const;

export default function LoginEmail({ magicLink, appUrl, locale }: LoginEmailProps) {
  const copy = COPY[locale];
  return (
    <Shell appUrl={appUrl} locale={locale} preview={copy.preview}>
      <Paper padding="40px 32px 44px">
        {/* Kicker als Markenschrift-Art, wie die Zeile auf home: dort ist
            `.hv-kicker` ebenfalls Providence. Blockiert der Client Bilder,
            faellt sie auf den getrackten Alt-Text zurueck. */}
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
          art={copy.headline}
          appUrl={appUrl}
          altStyle={{ color: COLOR.text, fontSize: '30px', fontWeight: 700 }}
          style={{ margin: '0 auto 20px' }}
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
          {/* Second target for clients that mangle the styled anchor — the same
              href, as plain underlined text. */}
          <Link href={magicLink} style={{ color: COLOR.text, textDecoration: 'underline' }}>
            {copy.plainLink}
          </Link>
          .
        </Fineprint>
      </Paper>
    </Shell>
  );
}
