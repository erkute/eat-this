'use client';

import styles from './landing.module.css';
import { useTranslation } from '@/lib/i18n';

export default function Coming() {
  const { t } = useTranslation();
  return (
    <section className={styles.coming}>
      <span className={styles.secLabel}>{t('landing.comingEyebrow')}</span>
      <h2>{t('landing.comingHeadline')}</h2>
      <p>{t('landing.comingBody')}</p>
    </section>
  );
}
