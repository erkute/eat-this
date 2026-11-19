import styles from './RemyDesktop.module.css';
import { BinIcon, ComputerIcon } from './RemyIcons';

/** Desktop decoration; actual navigation remains in the Start menu. */
export default function RemyDesktop({ en }: { en: boolean }) {
  return (
    <div className={styles.desktop}>
      <div className={styles.icons}>
        <div className={styles.icon}><ComputerIcon /><span>{en ? 'My Computer' : 'Arbeitsplatz'}</span></div>
        <div className={styles.icon}><BinIcon /><span>{en ? 'Recycle Bin' : 'Papierkorb'}</span></div>
      </div>
    </div>
  );
}
