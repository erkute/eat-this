'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import MapIntentLink from '@/app/components/MapIntentLink';
import { useMapData } from '@/lib/map';
import styles from './Profile.module.css';

/**
 * Wie viel von Berlin diesem Konto schon gehört — die eine Zahl, die das
 * ganze Produkt zusammenfasst (User-Wunsch, 26.08.2026: „ein kleiner Reiter,
 * wo Berlin steht und wie viel Spots man schon freigeschaltet hat, von wie
 * vielen").
 *
 * Ink-Fläche mit gelber Zahl — dieselbe Sprache wie der Belohnungs-Screen
 * nach der Anmeldung, absichtlich: dort wächst die Zahl, hier steht sie. Die
 * Daten kommen aus useMapData, derselben Quelle wie die Karte selbst; der
 * localStorage-Seed zeichnet sofort, der Refetch dahinter hält es ehrlich.
 * Solange nichts geladen ist, rendert die Sektion gar nicht — eine Null, die
 * gleich von der echten Zahl ersetzt würde, wäre eine Lüge auf Zeit.
 */
export default function ProfileCityProgress({ uid }: { uid: string }) {
  const t = useTranslations('profile');
  const { restaurants, totalCount, loading } = useMapData({ uid, authLoading: false });

  const open = restaurants.length;
  const pct = useMemo(
    () => (totalCount > 0 ? Math.min(100, Math.round((open / totalCount) * 100)) : 0),
    [open, totalCount]
  );

  if (loading && open === 0) return null;
  if (totalCount === 0) return null;

  return (
    <section className={`hv-section hv-wrap ${styles.section}`}>
      <MapIntentLink href="/map" className={styles.city} rel="nofollow">
        <span className={styles.cityKicker}>{t('cityKicker')}</span>
        <span className={styles.cityNumbers}>
          <span className={styles.cityOpen}>{open}</span>
          <span className={styles.cityTotal}>{t('cityCount', { total: totalCount })}</span>
        </span>
        {/* Balken statt Prozentzahl: die Fläche sagt „da ist noch Stadt übrig"
            deutlicher als jede Ziffer — und sie ist der stille Verkäufer für
            die Packs, ohne hier eines zu nennen. */}
        <span className={styles.cityBar} aria-hidden="true">
          <span className={styles.cityBarFill} style={{ width: `${pct}%` }} />
        </span>
        <span className={styles.cityCta}>{t('cityCta')}</span>
      </MapIntentLink>
    </section>
  );
}
