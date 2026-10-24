/* eslint-disable @next/next/no-img-element -- Preserve the original 32px desktop pixels without resizing. */
import styles from './RemyDesktop.module.css';

/** Desktop decoration; actual navigation remains in the Start menu. */
export default function RemyDesktop({ en }: { en: boolean }) {
  return (
    <div className={styles.desktop}>
      <div className={styles.icons}>
        <div className={styles.icon}><img src="/pics/remy/icons/computer.webp" width={32} height={32} alt="" /><span>{en ? 'My Computer' : 'Arbeitsplatz'}</span></div>
        <div className={styles.icon}><img src="/pics/remy/icons/recycle-empty.webp" width={32} height={32} alt="" /><span>{en ? 'Recycle Bin' : 'Papierkorb'}</span></div>
      </div>
    </div>
  );
}
