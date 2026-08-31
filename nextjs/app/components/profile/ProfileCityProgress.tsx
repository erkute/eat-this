'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import MapIntentLink from '@/app/components/MapIntentLink';
import styles from './Profile.module.css';

/**
 * Wie viel von Berlin diesem Konto schon gehört — die eine Zahl, die das
 * ganze Produkt zusammenfasst (User-Wunsch, 26.08.2026: „ein kleiner Reiter,
 * wo Berlin steht und wie viel Spots man schon freigeschaltet hat, von wie
 * vielen").
 *
 * Sitzt seit 31.08.2026 IN der Ink-Bank des Kopfes statt als eigener
 * Abschnitt darunter: Figur, Name und diese Zahl beantworten dieselbe Frage
 * („wer bin ich, wo stehe ich"), standen dafür aber zwei Bildschirme
 * auseinander — und die Ink-Fläche war die einzige weit oben, die gelbe
 * Einladen-Fläche die einzige ganz unten.
 *
 * Die Zahlen kommen von oben, nicht mehr aus einem eigenen useMapData:
 * ProfileShell hält denselben Hook ohnehin, der zweite Aufruf war ein zweiter
 * /api/map-data-Abruf für dieselbe Antwort. Bei totalCount 0 rendert die
 * Bank ohne diesen Block weiter — eine Null, die gleich von der echten Zahl
 * ersetzt würde, wäre eine Lüge auf Zeit.
 */
export default function ProfileCityProgress({ open, total }: { open: number; total: number }) {
  const t = useTranslations('profile');

  const pct = useMemo(
    () => (total > 0 ? Math.min(100, Math.round((open / total) * 100)) : 0),
    [open, total]
  );

  if (total === 0) return null;

  return (
    <MapIntentLink href="/map" className={styles.city} rel="nofollow">
      {/* Der Weg raus sitzt neben dem Label, nicht unter dem Balken: unter
          dem Balken standen zwei gelbe Linien uebereinander — sein
          Unterstrich und der Balken selbst — und auf schmalen Schirmen
          kostete er die Zeile, die der Kopf gerade eingespart hatte. */}
      <span className={styles.cityTop}>
        <span className={styles.cityKicker}>{t('cityKicker')}</span>
        <span className={styles.cityCta}>{t('cityCta')}</span>
      </span>
      <span className={styles.cityNumbers}>
        <span className={styles.cityOpen}>{open}</span>
        <span className={styles.cityTotal}>{t('cityCount', { total })}</span>
      </span>
      {/* Balken statt Prozentzahl: die Fläche sagt „da ist noch Stadt übrig"
          deutlicher als jede Ziffer — und sie ist der stille Verkäufer für
          die Packs, ohne hier eines zu nennen. */}
      <span className={styles.cityBar} aria-hidden="true">
        <span className={styles.cityBarFill} style={{ width: `${pct}%` }} />
      </span>
    </MapIntentLink>
  );
}
