'use client';

import { useState } from 'react';
import styles from './landing.module.css';
import { useTranslation } from '@/lib/i18n';

export default function LandingFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const { t } = useTranslation();
  const FAQS: { q: string; a: string | string[] }[] = [
    {
      q: t('landing.faqQ1'),
      a: [t('landing.faqA1p0'), t('landing.faqA1p1'), t('landing.faqA1p2')],
    },
    { q: t('landing.faqQ2'), a: t('landing.faqA2') },
    { q: t('landing.faqQ3'), a: t('landing.faqA3') },
    { q: t('landing.faqQ4'), a: t('landing.faqA4') },
    { q: t('landing.faqQ5'), a: t('landing.faqA5') },
    { q: t('landing.faqQ6'), a: t('landing.faqA6') },
    { q: t('landing.faqQ7'), a: t('landing.faqA7') },
  ];

  return (
    <section className={styles.faq}>
      <span className={styles.secLabel}>{t('landing.faqEyebrow')}</span>
      <h2>{t('landing.faqHeadline')}</h2>
      {FAQS.map((item, i) => {
        const open = openIdx === i;
        return (
          <div
            key={item.q}
            className={`${styles.faqItem} ${open ? styles.open : ''}`}
            onClick={() => setOpenIdx(open ? null : i)}
          >
            <div className={styles.faqRow}>
              <p className={styles.faqQ}>{item.q}</p>
              <span className={styles.faqIcon}>+</span>
            </div>
            {Array.isArray(item.a)
              ? item.a.map((para, j) => <p key={j} className={styles.faqA}>{para}</p>)
              : <p className={styles.faqA}>{item.a}</p>}
          </div>
        );
      })}
    </section>
  );
}
