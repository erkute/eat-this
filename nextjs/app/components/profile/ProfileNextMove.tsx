'use client';

import { useState } from 'react';
import Image from '@/app/components/SiteImage';
import { useLocale, useTranslations } from 'next-intl';
import MapIntentLink from '@/app/components/MapIntentLink';
import { formatLocalizedDistance } from '@/lib/map/distance';
import { normalizeName } from '@/lib/normalizeName';
import { getLocatingCopy } from '@/lib/map/locationStatus';
import { useUserLocationContext } from '@/lib/map/UserLocationContext';
import { FALLBACK_DISTRICT, pickNextMove } from '@/lib/profile/nextMove';
import type { MapMustEat } from '@/lib/types';
import styles from './Profile.module.css';

const CARD_BACK = '/pics/card-back.webp?v=8';

interface Props {
  /** Die eigenen Must Eats — dieselbe Liste, die das Deck zeigt. */
  mustEats: MapMustEat[];
  faceUpIds: ReadonlySet<string>;
  /** restaurantId → kuratierter Bezirk, aus ProfileShell. */
  districtByRest: ReadonlyMap<string, string>;
}

/** Ein konkreter Ausflug zu einer noch verdeckten Karte im eigenen Deck. */
export default function ProfileNextMove({ mustEats, faceUpIds, districtByRest }: Props) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const { location, loading, error, request } = useUserLocationContext();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const input = {
    mustEats,
    faceUpIds,
    districtOf: (m: MapMustEat) =>
      districtByRest.get(m.restaurant._id) ?? m.restaurant.district ?? FALLBACK_DISTRICT,
    location,
  };
  const move = pickNextMove({ ...input, selectedId });
  // Nur eine weggefallene/aufgedeckte Karte ersetzen, bevor React den Stand
  // zeichnet. Spät eintreffende Standortdaten ergänzen nur die Entfernung.
  const nextId = move?.target._id ?? null;
  if (nextId !== selectedId) setSelectedId(nextId);

  async function findNear() {
    const position = await request();
    if (position) {
      setSelectedId(pickNextMove({ ...input, location: position })?.target._id ?? null);
    }
  }

  if (!move) return null;

  const distance =
    move.meters === null
      ? null
      : formatLocalizedDistance(move.meters, locale === 'en' ? 'en' : 'de');

  const canLocate = error !== 'denied';
  const spot = move.target.restaurant;
  const name = normalizeName(spot.name);
  const href = `/map?r=${encodeURIComponent(spot.slug)}`;
  const meta = distance ? `${move.district} · ${distance}` : move.district;

  return (
    <article className={styles.move} aria-label={t('moveLabel')}>
      <div className={styles.moveMedia}>
        <MapIntentLink
          href={href}
          rel="nofollow"
          className={styles.movePhoto}
          aria-label={t('albumToSpot', { name })}
        >
          {spot.photo ? (
            <Image
              src={spot.photo}
              alt=""
              width={208}
              height={156}
              sizes="(max-width: 640px) 104px, 208px"
              loading="lazy"
            />
          ) : (
            <Image
              className={styles.moveFallback}
              src={CARD_BACK}
              alt=""
              width={132}
              height={181}
            />
          )}
        </MapIntentLink>
        {spot.photo && (
          <Image
            className={styles.moveCard}
            src={CARD_BACK}
            alt=""
            aria-hidden="true"
            width={46}
            height={63}
          />
        )}
      </div>
      <div className={styles.moveCopy}>
        <p className={`et-label ${styles.moveKicker}`}>{t('moveLabel')}</p>
        <h3 className={styles.moveTitle}>{name}</h3>
        <p className={styles.moveMeta} aria-live="polite">
          {meta}
        </p>
        <div className={styles.moveActions}>
          <MapIntentLink href={href} rel="nofollow" className="et-btn et-btn-sm">
            {t('moveGo')}
          </MapIntentLink>
          {canLocate && (
            <button
              type="button"
              disabled={loading}
              className="et-btn et-btn-alt et-btn-sm"
              onClick={() => void findNear()}
            >
              {loading ? getLocatingCopy(locale) : t('moveFindNear')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
