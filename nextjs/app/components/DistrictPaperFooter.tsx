import type { ReactNode } from 'react';
import PaperPhoto from './PaperPhoto';
import SiteFooter from './SiteFooter';
import styles from './DistrictPaperFooter.module.css';

export default function DistrictPaperFooter({ children }: { children: ReactNode }) {
  return (
    <div className={styles.surface} data-district-paper="" data-paper-surface="">
      <PaperPhoto />
      {children}
      <SiteFooter />
    </div>
  );
}
