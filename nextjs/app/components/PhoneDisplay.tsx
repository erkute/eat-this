import type { ReactNode } from 'react';
import styles from './PhoneDisplay.module.css';

/** Shared iPhone casing and display chrome for the home and About previews. */
export default function PhoneDisplay({ children }: { children: ReactNode }) {
  return (
    <div className={styles.display}>
      <span className={styles.status} aria-hidden="true"><span>9:41</span><i /><svg className={styles.statusIcons} viewBox="0 0 64 14" fill="currentColor"><rect x="1" y="8" width="3" height="5" rx=".8"/><rect x="6" y="6" width="3" height="7" rx=".8"/><rect x="11" y="3" width="3" height="10" rx=".8"/><rect x="16" y="0" width="3" height="13" rx=".8"/><path d="M23 4a11 11 0 0 1 16 0l-2 2a8 8 0 0 0-12 0zm3 4a7 7 0 0 1 10 0l-2 2a4 4 0 0 0-6 0zm3 3a3 3 0 0 1 4 0l-2 2z"/><rect x="43" y="1" width="18" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1"/><rect x="45" y="3" width="14" height="7" rx="1.5"/><path d="M63 4v5" stroke="currentColor" strokeWidth="2"/></svg></span>
      {children}
      <span className={styles.homeBar} aria-hidden="true" />
    </div>
  );
}
