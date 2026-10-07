'use client';

import { useTranslation } from '@/lib/i18n';
import styles from './HubMapPreview.module.css';

export default function HomeMapLoading({ label }: { label?: string }) {
  const { lang } = useTranslation();
  return (
    <div className={styles.mapStatus} role="status" data-map-loading="">
      <span>{label ?? (lang === 'de' ? 'Berlin lädt …' : 'Loading Berlin …')}</span>
      <div className={styles.loadingTrack} aria-hidden="true">
        <span className={styles.loadingBar} data-loading-bar="" />
      </div>
    </div>
  );
}
