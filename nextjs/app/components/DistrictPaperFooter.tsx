import type { ReactNode } from 'react';
import FoldedPaperBackdrop from './FoldedPaperBackdrop';
import SiteFooter from './SiteFooter';
import styles from './DistrictPaperFooter.module.css';

export default function DistrictPaperFooter({ children, paperId }: { children: ReactNode; paperId: string }) {
  return (
    <div className={styles.surface} data-district-paper="">
      <FoldedPaperBackdrop id={paperId} />
      {children}
      <SiteFooter />
    </div>
  );
}
