// Login mail — for an address that already has an account.
//
// One job: get the person back in. Everything sits above the fold, there is no
// product pitch and no restaurant artwork, so the mail renders instantly, stays
// small, and reads as transactional to spam filters. The signup mail
// (SignupEmail.tsx) is the one that sells.

import { Link } from '@react-email/components';
import { Shell } from './components/Shell';
import { ArtImage, CtaButton, Fineprint, Kicker, Lead, Paper } from './components/Pieces';
import { ART } from './art.generated';
import { COLOR } from './theme';

export interface LoginEmailProps {
  /** The Firebase sign-in link the recipient clicks to authenticate. */
  magicLink: string;
  /** Absolute base URL for artwork (https://www.eatthisdot.com or http://localhost:3000). */
  appUrl: string;
}

export const LOGIN_SUBJECT = 'Dein Login-Link für Eat This';

export default function LoginEmail({ magicLink, appUrl }: LoginEmailProps) {
  return (
    <Shell appUrl={appUrl} preview="Ein Klick und du bist drin — dein Login-Link.">
      <Paper padding="40px 32px 44px">
        <Kicker>Schön, dass du wieder da bist</Kicker>

        <ArtImage
          art={ART.headlineLogin}
          appUrl={appUrl}
          altStyle={{ color: COLOR.red, fontSize: '30px', fontWeight: 700 }}
          style={{ margin: '0 0 20px' }}
        />

        <Lead style={{ marginBottom: '28px' }}>
          Ein Klick und deine Map ist offen — mit allem, was du schon freigeschaltet hast.
        </Lead>

        <CtaButton href={magicLink} label="Einloggen" />

        <Fineprint>
          Der Link gilt 1 Stunde und nur für deine E-Mail-Adresse. Falls der Button nicht reagiert:{' '}
          {/* Second target for clients that mangle the styled anchor — the same
              href, as plain underlined text. */}
          <Link href={magicLink} style={{ color: COLOR.ink, textDecoration: 'underline' }}>
            hier ist er als normaler Link
          </Link>
          .
        </Fineprint>
      </Paper>
    </Shell>
  );
}
