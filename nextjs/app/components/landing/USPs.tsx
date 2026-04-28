'use client';

import styles from './landing.module.css';
import { useTranslation } from '@/lib/i18n';

export default function USPs() {
  const { t } = useTranslation();
  const USPS = [
    {
      num: '01',
      title: t('landing.usp1Title'),
      body: t('landing.usp1Body'),
    },
    {
      num: '02',
      title: t('landing.usp2Title'),
      body: t('landing.usp2Body'),
    },
    {
      num: '03',
      title: t('landing.usp3Title'),
      body: t('landing.usp3Body'),
    },
  ];

  return (
    <section className={styles.usps}>
      {USPS.map((u) => (
        <div key={u.num} className={styles.usp}>
          <div className={styles.uspNum}>{u.num}</div>
          <div className={styles.uspBody}>
            <h3>{u.title}</h3>
            <p>{u.body}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
