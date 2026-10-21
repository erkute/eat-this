'use client';

import { useSyncExternalStore } from 'react';
import {
  currentTheme,
  setTheme,
  subscribeTheme,
  type Theme,
} from '@/lib/theme';
import styles from './ThemeToggle.module.css';

const serverTheme = (): Theme => 'light';

export default function ThemeToggle({
  de,
  className = '',
}: {
  de: boolean;
  className?: string;
}) {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, serverTheme);
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className={`${styles.toggle} ${className}`}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <span className={styles.toDark}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z" />
        </svg>
        {de ? 'Dunkel' : 'Dark'}
      </span>
      <span className={styles.toLight}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
        {de ? 'Hell' : 'Light'}
      </span>
    </button>
  );
}
