// Login mail — for an address that already has an account.
//
// One job: get the person back in. Everything sits above the fold, there is no
// product pitch and no restaurant artwork, so the mail renders instantly, stays
// small, and reads as transactional to spam filters. The signup mail
// (SignupEmail.tsx) is the one that sells.

import { Link, Section } from '@react-email/components';
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
    intro: ART.introLogin,
    lead: ART.leadLogin,
    cta: ART.ctaAnmelden,
    fineprint:
      'Dein Anmeldelink ist eine Stunde gültig und gilt nur für deine E-Mail-Adresse. Der Button funktioniert nicht?',
    plainLink: 'Anmeldelink öffnen',
  },
  en: {
    preview: 'One click and you’re in — your sign-in link.',
    intro: ART.introLoginEn,
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
      <Paper foil appUrl={appUrl} padding="0">
        <ArtImage art={copy.intro} appUrl={appUrl}
          altStyle={{color: COLOR.text, fontSize: '16px'}} style={{width: '100%', margin: 0}} />
        <Section className="et-pad" style={{padding: '0 32px 40px'}}>
        <ArtImage art={copy.lead} appUrl={appUrl}
          altStyle={{color: COLOR.text, fontSize: '16px'}} style={{margin: '0 auto 20px'}} />
        <ArtImage art={ART.heroMustEat} appUrl={appUrl}
          altStyle={{color: COLOR.text, fontSize: '14px'}} style={{margin: '0 auto 24px'}} />
        <CtaButton href={magicLink} art={copy.cta} appUrl={appUrl} />

        <Fineprint>
          {copy.fineprint}
          <br />
          {/* Second target for clients that mangle the styled anchor — the same
              href, as plain underlined text. */}
          <Link href={magicLink} style={{ color: COLOR.text, textDecoration: 'none', fontWeight: 700 }}>
            {copy.plainLink}
          </Link>
          .
        </Fineprint>
        </Section>
      </Paper>
    </Shell>
  );
}
