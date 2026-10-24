'use client';

import { useSyncExternalStore } from 'react';
import {
  currentTheme,
  setTheme,
  subscribeTheme,
  type Theme,
} from '@/lib/theme';
import styles from './ThemeSwitch.module.css';

const serverTheme = (): Theme => 'light';

const useTheme = () => useSyncExternalStore(subscribeTheme, currentTheme, serverTheme);

const MOON = <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z" />;
const SUN = (
  <>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
  </>
);

/** Hell und Dunkel als Icon-Paar, gebaut wie die Sprachwahl DE/EN daneben:
 *  zwei Knöpfe, der gewählte gedrückt. `className` kommt vom Aufrufer, damit
 *  beide Paare gleich aussehen. */
export function ThemeSwitch({ de, className = '' }: { de: boolean; className?: string }) {
  const theme = useTheme();
  return (
    <>
      <button type="button" className={`${styles.icon} ${className}`} aria-pressed={theme === 'light'} aria-label={de ? 'Hell' : 'Light'} onClick={() => setTheme('light')}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{SUN}</svg>
      </button>
      <button type="button" className={`${styles.icon} ${className}`} aria-pressed={theme === 'dark'} aria-label={de ? 'Dunkel' : 'Dark'} onClick={() => setTheme('dark')}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{MOON}</svg>
      </button>
    </>
  );
}
