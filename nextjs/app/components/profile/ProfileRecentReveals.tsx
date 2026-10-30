'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import MapIntentLink from '@/app/components/MapIntentLink';
import { normalizeName } from '@/lib/normalizeName';
import { mustEatCardSrc, mustEatCardSrcSet } from '@/lib/must-eat/cardImage';
import type { MapMustEat } from '@/lib/types';
import styles from './Profile.module.css';

const MAX_CARDS = 8;

/** Coarse "vor 3 Tagen" without pulling in a date library. */
function relativeDay(locale: string, then: number, now: number): string {
  const days = Math.round((then - now) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (days > -7) return rtf.format(days, 'day');
  if (days > -31) return rtf.format(Math.round(days / 7), 'week');
  return rtf.format(Math.round(days / 30), 'month');
}

/**
 * Die letzten Karten, die jemand vor Ort aufgedeckt hat, neueste zuerst.
 *
 * Aufdecken ist das Einzige im Produkt, das zu einem Zeitpunkt an einem Ort
 * passiert — das Deck darüber zeigt nur einen Zustand. `unlockedAt` wird bei
 * jedem Aufdecken geschrieben.
 *
 * Der Abschnitt rendert ab der ersten Karte: das Datum steht über der Karte,
 * und alle Einträge hängen an einer Linie über die volle Breite. Bei null
 * Aufdeckungen bleibt er weg.
 */
export default function ProfileRecentReveals({
  mustEats,
  unlockedAt,
}: {
  mustEats: MapMustEat[];
  unlockedAt: ReadonlyMap<string, number>;
}) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const recent = useMemo(() => {
    const now = Date.now();
    return (
      mustEats
        .map((m) => ({ mustEat: m, at: unlockedAt.get(m._id) ?? 0 }))
        // Only self-revealed cards carry a timestamp, and only face-up ones
        // carry the dish + image the strip is made of.
        .filter((e) => e.at > 0 && !!e.mustEat.image)
        .sort((a, b) => b.at - a.at)
        .slice(0, MAX_CARDS)
        .map((e) => ({ ...e, when: relativeDay(locale, e.at, now) }))
    );
  }, [mustEats, unlockedAt, locale]);

  if (recent.length === 0) return null;

  return (
    <section className={styles.deckSection}>
      <div className={`hv-head ${styles.head}`}>
        <h2 className={styles.sectionTitle}>{t('recentHeading')}</h2>
      </div>
      {/* Die Linie traegt den Abschnitt ueber die volle Breite, auch wenn
          nur ein Eintrag daran haengt. Dasselbe Mittel wie die
          Bezirks-Trenner im Deck darueber. */}
      <ol className={`hv-rail ${styles.recentRail}`}>
        {recent.map(({ mustEat, when }) => (
          <li key={mustEat._id} className={styles.recentItem}>
            {/* Das Datum steht jetzt oben, nicht als Anhaengsel hinter dem
                Lokal: es ist die Achse, an der die Reihe haengt. */}
            <p className={styles.recentWhen}>{when}</p>
            <MapIntentLink
              href={`/map?r=${encodeURIComponent(mustEat.restaurant.slug)}`}
              rel="nofollow"
              className={styles.recentCard}
            >
              {/* Private album art loads straight from the protected route —
                  next/image's optimizer would drop the capability cookie. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mustEatCardSrc(mustEat.image, 360)}
                srcSet={mustEatCardSrcSet(mustEat.image)}
                sizes="176px"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </MapIntentLink>
            <p className={styles.recentDish}>{mustEat.dish}</p>
            <p className={styles.recentMeta}>{normalizeName(mustEat.restaurant.name)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
