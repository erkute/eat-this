'use client';

import styles from './landing.module.css';
import { useTranslation } from '@/lib/i18n';

export default function About() {
  const { t } = useTranslation();
  return (
    <section className={styles.about}>
      <span className={styles.aboutStats}>{t('landing.stats')}</span>
      <span className={styles.secLabel}>{t('landing.aboutEyebrow')}</span>
      <h2 className={styles.aboutHeadline}>{t('landing.aboutHeadline')}</h2>
      <p className={styles.aboutBody}>
        {t('landing.aboutBody')}
      </p>
    </section>
  );
}
