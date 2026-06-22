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

// Panini sticker-album of collected Must-Eats. Filled slots show the card art
// with a red number badge + corner mounts; empty slots are a dashed "?" socket.
// Numbers are stable per (category, id) so a slot keeps its place as the
// collection grows.
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
              const no = String(slot.no).padStart(3, '0');
              if (slot.collected && slot.mustEat) {
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`${styles.slot} ${styles.filled}`}
                    onClick={() => router.push(`/map?me=${slot.id}`)}
                  >
                    <span className={styles.no}>{no}</span>
                    <span className={`${styles.corner} ${styles.tl}`} />
                    <span className={`${styles.corner} ${styles.tr}`} />
                    <span className={`${styles.corner} ${styles.bl}`} />
                    <span className={`${styles.corner} ${styles.br}`} />
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
                  <span className={styles.no}>{no}</span>
                  <span className={styles.q}>?</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
