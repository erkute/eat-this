'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ShareButton from '../ShareButton';
import { useReferralCount } from '@/lib/firebase/useReferralCount';
import { SITE_URL } from '@/lib/constants';
import styles from './Profile.module.css';

// The referral machinery has been complete on the server since day one
// (middleware captures ?ref=<uid> → /api/referral/confirm awards both sides)
// but had no front door anywhere in the app. This is it.
//
// The bonus size is deliberately absent from the copy — see the no-spot-counts
// note on REFERRAL_BONUS_SIZE. Die Zahl der Eingeladenen ist etwas anderes:
// sie zählt keine Spots, sondern beantwortet die einzige Frage, die der Kasten
// bisher offen ließ — ist überhaupt je jemand über meinen Link gekommen?
export default function ProfileInvite({ uid }: { uid: string }) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const joined = useReferralCount(uid);
  // Same origin the user is on, so an invite copied from staging stays on
  // staging. SSR has no origin; the canonical host is the honest fallback.
  const [origin, setOrigin] = useState(SITE_URL);
  useEffect(() => setOrigin(window.location.origin), []);
  const inviteUrl = `${origin}${locale === 'en' ? '/en' : '/'}?ref=${uid}`;

  return (
    <div className={styles.invite}>
      <div className={styles.inviteCopy}>
        <h2 className={styles.inviteTitle}>{t('inviteHeading')}</h2>
        <p className={styles.inviteLine}>{t('inviteLine')}</p>
        {/* Erst ab der ersten Anmeldung. „Noch niemand" wäre eine Bilanz, die
            keiner sehen will, und der Satz darüber erklärt den Handel schon. */}
        {joined !== null && joined > 0 && (
          <p className={styles.inviteJoined}>
            {joined === 1 ? t('inviteJoinedOne') : t('inviteJoinedMany', { count: joined })}
          </p>
        )}
      </div>
      <div className={styles.inviteAction}>
        <span className={styles.inviteUrl} title={inviteUrl}>
          {inviteUrl.replace(/^https?:\/\//, '')}
        </span>
        <ShareButton
          className={styles.inviteButton}
          url={inviteUrl}
          title={t('inviteShareTitle')}
          slug={uid}
          contentType="referral_invite"
          label={t('inviteCta')}
          copiedLabel={t('inviteCopied')}
        />
      </div>
    </div>
  );
}
