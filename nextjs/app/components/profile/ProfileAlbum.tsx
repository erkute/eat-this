'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import type { MapMustEat } from '@/lib/types';
import { buildAlbum, type AlbumMustEat } from '@/lib/profile/mustEatAlbum';
import styles from './ProfileAlbum.module.css';

interface Props {
  mustEats: MapMustEat[];
  faceUpIds: Set<string>;
  categoryOf: (m: MapMustEat) => string;
}

const CARD_BACK = '/pics/card-back.webp?v=6';

// Panini sticker-album of collected Must-Eats. Collected slots show the card
// art; uncollected slots show the face-down card back. Slots keep a stable
// place per (category, id) as the collection grows.
export default function ProfileAlbum({ mustEats, faceUpIds, categoryOf }: Props) {
  const t = useTranslations('profile');
  const router = useRouter();
  const pages = useMemo(
    () => buildAlbum(mustEats as AlbumMustEat[], faceUpIds, (m) => categoryOf(m as MapMustEat)),
    [mustEats, faceUpIds, categoryOf]
  );
  const total = mustEats.length;
  const collected = pages.reduce((n, p) => n + p.slots.filter((s) => s.collected).length, 0);

  return (
    <div>
      <div className={styles.head}>
        <h2>{t('albumHeading')}</h2>
        <span className={styles.count}>{t('albumStuck', { collected, total })}</span>
      </div>

      {pages.map((page, pi) => (
        <div key={page.category} className={styles.album}>
          <p className={styles.pageHead}>
            {page.category} · {pi + 1} / {pages.length}
          </p>
          <div className={styles.grid}>
            {page.slots.map((slot) => {
              if (slot.collected && slot.mustEat) {
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`${styles.slot} ${styles.filled}`}
                    onClick={() => router.push(`/map?me=${slot.id}`)}
                  >
                    {slot.mustEat.image && (
                      <Image
                        src={slot.mustEat.image}
                        alt=""
                        fill
                        sizes="200px"
                        className={styles.img}
                      />
                    )}
                  </button>
                );
              }
              return (
                <div key={slot.id} className={`${styles.slot} ${styles.empty}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.backImg} src={CARD_BACK} alt="" loading="lazy" />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
