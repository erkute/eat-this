'use client';

import styles from './landing.module.css';
import { useTranslation } from '@/lib/i18n';

const FEATURES = [
  { img: '/pics/map-teaser/map_liste.webp',    titleKey: 'landing.mapFeature3Title', bodyKey: 'landing.mapFeature3Body' },
  { img: '/pics/map-teaser/map_filter.webp',   titleKey: 'landing.mapFeature2Title', bodyKey: 'landing.mapFeature2Body' },
  { img: '/pics/map-teaser/map_must-eat.webp', titleKey: 'landing.mapFeature1Title', bodyKey: 'landing.mapFeature1Body' },
] as const;

export default function MapTeaser() {
  const { t } = useTranslation();

  return (
    <section className={styles.mapTeaser}>
      <div className={styles.mapTeaserHead}>
        <span className={styles.secLabel}>{t('landing.mapEyebrow')}</span>
        <h2>{t('landing.mapHeadline')}</h2>
        <p>{t('landing.mapBody')}</p>
      </div>
      <div className={styles.mapFeatures}>
        {FEATURES.map((f, i) => (
          <article key={i} className={styles.mapFeature}>
            <div className={styles.mapFeatureFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.img} alt="" loading="lazy" decoding="async" />
            </div>
            <h3 className={styles.mapFeatureTitle}>{t(f.titleKey)}</h3>
            <p className={styles.mapFeatureBody}>{t(f.bodyKey)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
