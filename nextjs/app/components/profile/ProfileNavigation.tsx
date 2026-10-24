'use client';

import { useTranslations } from 'next-intl';
import styles from './Profile.module.css';

export const PROFILE_TABS = ['deck', 'spots', 'packs', 'account'] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

export default function ProfileNavigation({
  tab,
  onChange,
}: {
  tab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}) {
  const t = useTranslations('profile');
  return (
    <div className={styles.tabs} role="tablist" aria-label={t('tabsLabel')}>
      {PROFILE_TABS.map((id, index) => (
        <button
          key={id}
          id={`profile-tab-${id}`}
          type="button"
          role="tab"
          aria-selected={tab === id}
          aria-controls={`profile-panel-${id}`}
          tabIndex={tab === id ? 0 : -1}
          className={styles.tab}
          onClick={() => onChange(id)}
          onKeyDown={(event) => {
            let next: number;
            if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = PROFILE_TABS.length - 1;
            else if (event.key === 'ArrowRight') next = (index + 1) % PROFILE_TABS.length;
            else if (event.key === 'ArrowLeft')
              next = (index - 1 + PROFILE_TABS.length) % PROFILE_TABS.length;
            else return;
            event.preventDefault();
            onChange(PROFILE_TABS[next]);
            document.getElementById(`profile-tab-${PROFILE_TABS[next]}`)?.focus();
          }}
        >
          <span>{t(`tab_${id}`)}</span>
        </button>
      ))}
    </div>
  );
}
