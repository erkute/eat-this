'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth, useLoginModal } from '@/lib/auth';
import ShareButton from '@/app/components/ShareButton';
import { SITE_URL } from '@/lib/constants';
import deck from './Deck.module.css';

/**
 * Der Ausgang des geteilten Decks.
 *
 * Fuer den Freund, der den Link bekommt, ist das EIN Weg: auf die Map. Die
 * Anmeldung steht als Text-Knopf daneben und oeffnet dasselbe Fenster wie
 * ueberall sonst. Geworben ist der Besucher, wo immer er sich anmeldet: das
 * `?ref`-Cookie liegt seit dem Aufruf im Browser (siehe page.tsx).
 *
 * Wer sein EIGENES Deck ansieht, bekommt Teilen als Hauptknopf und die Map
 * daneben.
 */
export default function DeckActions({ uid }: { uid: string }) {
  const t = useTranslations('deck');
  const tProfile = useTranslations('profile');
  const locale = useLocale();
  const { user } = useAuth();
  const { open: openLogin } = useLoginModal();
  const isOwner = user?.uid === uid;
  /* Dieselbe Adresse, die das Profil teilt — siehe ProfileInvite. */
  const [origin, setOrigin] = useState(SITE_URL);
  useEffect(() => setOrigin(window.location.origin), []);
  const inviteUrl = `${origin}${locale === 'en' ? '/en' : ''}/deck/${uid}?ref=${uid}`;

  /* Ohne `locale`-Prop: `localePrefix` ist `as-needed`, und ein explizit
     mitgegebenes `de` erzwingt `/de/map` — von dort schickt die Middleware
     mit 308 auf `/map`. */
  if (isOwner) {
    return (
      <>
        <ShareButton
          className="et-btn"
          url={inviteUrl}
          title={tProfile('inviteShareTitle')}
          slug={uid}
          contentType="referral_invite"
          label={tProfile('inviteCta')}
          copiedLabel={tProfile('inviteCopied')}
        />
        <Link className="et-btn et-btn-text" href="/map">
          {t('toMap')}
        </Link>
      </>
    );
  }

  return (
    <>
      <Link className="et-btn" href="/map">
        {t('toMap')}
      </Link>
      {/* `data-guest-only`: der Vorab-Bootstrap blendet den Knopf schon vor
          dem ersten Bild aus, wenn das Konto bekannt ist, sonst blitzt er
          fuer einen Angemeldeten kurz auf. */}
      <button
        type="button"
        className={`et-btn et-btn-text ${deck.signIn}`}
        data-guest-only=""
        hidden={Boolean(user)}
        onClick={() => openLogin()}
      >
        {t('signIn')}
      </button>
    </>
  );
}
