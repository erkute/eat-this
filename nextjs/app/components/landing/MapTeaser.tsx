'use client';

import styles from './landing.module.css';
import { useTranslation } from '@/lib/i18n';

export default function MapTeaser() {
  const { t } = useTranslation();

  return (
    <section className={styles.mapTeaser}>
      <div className={styles.mapTeaserHead}>
        <span className={styles.secLabel}>{t('landing.mapEyebrow')}</span>
        <h2>{t('landing.mapHeadline')}</h2>
        <p>{t('landing.mapBody')}</p>
      </div>
    </section>
  );
}
