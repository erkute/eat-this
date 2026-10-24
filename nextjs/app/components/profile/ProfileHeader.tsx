'use client';

import { useTranslations } from 'next-intl';
import styles from './Profile.module.css';

export default function ProfileHeader({
  name,
  avatarIdx,
  onPick,
}: {
  name: string;
  avatarIdx: number;
  onPick: () => void;
}) {
  const t = useTranslations('profile');
  return (
    <header className={styles.profileHeader}>
      <button
        type="button"
        className={styles.profileAvatar}
        onClick={onPick}
        aria-label={t('changeAvatar')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/pics/avatar/${avatarIdx}.webp?v=4`} alt="" width={160} height={200} />
      </button>
      <div className={styles.profileIntro}>
        <h1 className={styles.profileTitle}>{t('albumHello', { name })}.</h1>
        <p className={styles.profileName}>{t('profileHeading')}</p>
        <button type="button" className="et-btn et-btn-text et-btn-sm" onClick={onPick}>
          {t('changeAvatar')}
        </button>
      </div>
    </header>
  );
}
