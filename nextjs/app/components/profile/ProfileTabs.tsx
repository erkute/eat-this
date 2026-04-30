'use client';

import styles from './ProfileTabs.module.css';

export type ProfileTab = 'deck' | 'restaurants' | 'booster' | 'settings';

interface Props {
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}

const TABS: { id: ProfileTab; label: string; pulse?: boolean }[] = [
  { id: 'deck',        label: 'Deck' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'booster',     label: 'Booster', pulse: true },
  { id: 'settings',    label: 'Settings' },
];

export default function ProfileTabs({ active, onChange }: Props) {
  return (
    <div className={styles.tabs} role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`${styles.tab} ${active === tab.id ? styles.tabActive : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.pulse && active !== tab.id && <span className={styles.pulseDot} aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}
