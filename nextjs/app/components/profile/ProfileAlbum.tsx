'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import LazyMustEatImageLightbox from '@/app/components/map/LazyMustEatImageLightbox';
import type { MapMustEat } from '@/lib/types';
import { buildAlbum, type AlbumMustEat } from '@/lib/profile/mustEatAlbum';
import styles from './ProfileAlbum.module.css';

const CARD_BACK = '/pics/card-back.webp?v=6';

interface Props {
  mustEats: MapMustEat[];
  faceUpIds: Set<string>;
  categoryOf: (m: MapMustEat) => string;
}

// Collection — one continuous field. Collected slots show the dish card,
// uncollected ones the face-down card back. Tapping any card does the
// deck-style fly-out zoom, flying back to its slot on close.
export default function ProfileAlbum({ mustEats, faceUpIds, categoryOf }: Props) {
  const t = useTranslations('profile');
  const pages = useMemo(
    () => buildAlbum(mustEats as AlbumMustEat[], faceUpIds, (m) => categoryOf(m as MapMustEat)),
    [mustEats, faceUpIds, categoryOf]
  );
  const slots = useMemo(() => pages.flatMap((page) => page.slots), [pages]);
  const collected = slots.filter((slot) => slot.collected).length;

  const [expanded, setExpanded] = useState<{
    imageUrl: string;
    alt: string;
    rect: DOMRect;
    id: string;
  } | null>(null);
  // Hide the origin card while its zoomed clone is on screen; reveal it again in
  // onExitComplete (same frame the fly-back clone unmounts) so there's no blink.
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const handleOpenReady = useCallback(() => {
    const current = expandedRef.current;
    if (current) setHiddenId(current.id);
  }, []);
  const handleExitComplete = () => {
    if (!expandedRef.current) setHiddenId(null);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t('albumHeading')}</h2>
        {slots.length > 0 && (
          <span className={styles.count}>
            <strong>{collected}</strong>
            <span>{t('albumCount', { total: slots.length })}</span>
          </span>
        )}
      </div>

      {slots.length === 0 ? (
        <p className={styles.emptyText}>{t('emptyMustEats')}</p>
      ) : (
        <div className={styles.grid}>
          {slots.map((slot, index) => {
            const open = slot.collected && !!slot.mustEat?.image;
            const imageUrl = (open && slot.mustEat?.image) || CARD_BACK;
            const alt = (open ? slot.mustEat?.dish : undefined) ?? '';
            return (
              <button
                key={slot.id}
                type="button"
                aria-label={open ? alt : `${t('lockedSubhead')} ${index + 1}`}
                className={`${styles.slot} ${open ? styles.filled : styles.empty}`}
                style={{ visibility: hiddenId === slot.id ? 'hidden' : undefined }}
                onClick={(e) => {
                  setExpanded({
                    imageUrl,
                    alt,
                    rect: e.currentTarget.getBoundingClientRect(),
                    id: slot.id,
                  });
                }}
              >
                {open && slot.mustEat?.image ? (
                  <Image
                    src={slot.mustEat.image}
                    alt=""
                    fill
                    sizes="(min-width: 1040px) 160px, (min-width: 660px) 18vw, 30vw"
                    className={styles.img}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.backImg} src={CARD_BACK} alt="" loading="lazy" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <LazyMustEatImageLightbox
        active={Boolean(expanded || hiddenId)}
        imageUrl={expanded?.imageUrl ?? ''}
        alt={expanded?.alt ?? ''}
        originRect={expanded?.rect ?? null}
        onClose={() => setExpanded(null)}
        onOpenReady={handleOpenReady}
        onExitComplete={handleExitComplete}
      />
    </div>
  );
}
