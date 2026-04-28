'use client';

import styles from './landing.module.css';
import { useTranslation } from '@/lib/i18n';

export default function Selection() {
  const { t } = useTranslation();
  return (
    <section className={styles.selection}>
      <span className={styles.secLabel}>{t('landing.selectionEyebrow')}</span>
      <h2 className={styles.selectionHeadline}>{t('landing.selectionHeadline')}</h2>
      <p className={styles.selectionBody}>
        {t('landing.selectionBody')}
      </p>
    </section>
  );
}
