'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import MapIntentLink from '@/app/components/MapIntentLink';
import { normalizeName } from '@/lib/normalizeName';
import type { MapMustEat } from '@/lib/types';
import styles from './Profile.module.css';

const MAX_CARDS = 8;
// Below this the section is not a strip, it is one lonely card under a
// full-width heading — and a single reveal from months ago does not read as
// "zuletzt" either. The deck above already shows every card that is face-up,
// so nothing is lost by staying quiet.
const MIN_CARDS = 3;

/** Coarse "vor 3 Tagen" without pulling in a date library. */
function relativeDay(locale: string, then: number, now: number): string {
  const days = Math.round((then - now) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (days > -7) return rtf.format(days, 'day');
  if (days > -31) return rtf.format(Math.round(days / 7), 'week');
  return rtf.format(Math.round(days / 30), 'month');
}

/**
 * The last cards the user turned face-up on site, newest first.
 *
 * Reveals are the one thing in this product that happens at a moment, in a
 * place — the deck above only ever shows a state. `unlockedAt` was already
 * being written on every reveal and never read.
 *
 * Renders nothing until there are MIN_CARDS of them.
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

  if (recent.length < MIN_CARDS) return null;

  return (
    <section className={`hv-section hv-wrap ${styles.section}`}>
      <div className={`hv-head ${styles.head}`}>
        <h2 className="hv-title">{t('recentHeading')}</h2>
      </div>
      <ul className={`hv-rail ${styles.recentRail}`}>
        {recent.map(({ mustEat, when }) => (
          <li key={mustEat._id} className={styles.recentItem}>
            <MapIntentLink
              href={`/map?r=${encodeURIComponent(mustEat.restaurant.slug)}`}
              rel="nofollow"
              className={styles.recentCard}
            >
              {/* Private album art loads straight from the protected route —
                  next/image's optimizer would drop the capability cookie. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mustEat.image} alt="" loading="lazy" decoding="async" />
            </MapIntentLink>
            <p className={styles.recentDish}>{mustEat.dish}</p>
            <p className={styles.recentMeta}>
              {normalizeName(mustEat.restaurant.name)}
              <span> · {when}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
