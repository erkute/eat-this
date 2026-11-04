import type { ReactNode } from 'react';
import FoldedPaperBackdrop from './FoldedPaperBackdrop';
import PaperPhoto from './PaperPhoto';
import SiteFooter from './SiteFooter';
import styles from './DistrictPaperFooter.module.css';

export default function DistrictPaperFooter({ children, paperId }: { children: ReactNode; paperId: string }) {
  return (
    <div className={styles.surface} data-district-paper="" data-paper-surface="">
      <FoldedPaperBackdrop id={paperId} lazy />
      <PaperPhoto />
      {children}
      <SiteFooter />
    </div>
  );
}
