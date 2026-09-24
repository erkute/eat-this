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
 * Fuer den Freund, der den Link bekommt, ist das EIN Weg: auf die Map
 * (Nutzer, 24.09.2026: „es muss halt Bock auf die Map machen"). Die Anmeldung
 * steht daneben als leiser Link und oeffnet dasselbe Fenster wie ueberall
 * sonst — bis zum 24.09.2026 stand hier das ganze Formular samt Google-Knopf
 * auf der Seite und machte sie doppelt so lang. Geworben ist der Besucher
 * trotzdem, wo immer er sich anmeldet: das `?ref`-Cookie liegt seit dem
 * Aufruf im Browser (siehe page.tsx).
 *
 * Wer sein EIGENES Deck ansieht (der „Ansehen"-Link im Profil), bekommt das,
 * weswegen er hier ist: die Vorschau bestaetigt und den Teilen-Knopf.
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
      <div className={deck.actions}>
        <p className={deck.ownLine}>{t('ownLine')}</p>
        <div className={deck.actionRow}>
          <ShareButton
            className={deck.primary}
            url={inviteUrl}
            title={tProfile('inviteShareTitle')}
            slug={uid}
            contentType="referral_invite"
            label={tProfile('inviteCta')}
            copiedLabel={tProfile('inviteCopied')}
          />
          <Link className={deck.quiet} href="/map">
            {t('toMap')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={deck.actions}>
      <div className={deck.actionRow}>
        <Link className={deck.primary} href="/map">
          {t('toMap')}
        </Link>
        {/* `data-guest-only`: der Vorab-Bootstrap blendet den Link schon vor
            dem ersten Bild aus, wenn das Konto bekannt ist — sonst blitzt er
            fuer einen Angemeldeten kurz auf. */}
        <button
          type="button"
          className={deck.quiet}
          data-guest-only=""
          hidden={Boolean(user)}
          onClick={() => openLogin()}
        >
          {t('signIn')}
        </button>
      </div>
    </div>
  );
}
