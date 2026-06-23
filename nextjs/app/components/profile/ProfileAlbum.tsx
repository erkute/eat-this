'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import MustEatImageLightbox from '@/app/components/map/MustEatImageLightbox';
import type { MapMustEat } from '@/lib/types';
import { buildAlbum, type AlbumMustEat } from '@/lib/profile/mustEatAlbum';
import styles from './ProfileAlbum.module.css';

const CARD_BACK = '/pics/card-back.webp?v=6';

interface Props {
  mustEats: MapMustEat[];
  faceUpIds: Set<string>;
  categoryOf: (m: MapMustEat) => string;
}

// Collection — cream menu panel of category sections. Collected slots show the
// dish card, uncollected ones the face-down card back. Tapping any card does
// the deck-style fly-out zoom (the same MustEatImageLightbox the gallery + map
// use), flying back to its slot on close.
export default function ProfileAlbum({ mustEats, faceUpIds, categoryOf }: Props) {
  const t = useTranslations('profile');
  const pages = useMemo(
    () => buildAlbum(mustEats as AlbumMustEat[], faceUpIds, (m) => categoryOf(m as MapMustEat)),
    [mustEats, faceUpIds, categoryOf]
  );

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
  const handleExitComplete = () => {
    if (!expandedRef.current) setHiddenId(null);
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>{t('albumHeading')}</h2>

      {pages.map((page) => {
        const collectedInPage = page.slots.filter((s) => s.collected).length;
        return (
          <div key={page.category} className={styles.sec}>
            <div className={styles.secHead}>
              <h3>{page.category}</h3>
              <span className={styles.cnt}>
                {collectedInPage} / {page.slots.length}
              </span>
            </div>
            <div className={styles.grid}>
              {page.slots.map((slot) => {
                const open = slot.collected && !!slot.mustEat?.image;
                const imageUrl = (open && slot.mustEat?.image) || CARD_BACK;
                const alt = (open ? slot.mustEat?.dish : undefined) ?? '';
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`${styles.slot} ${open ? styles.filled : styles.empty}`}
                    style={{ visibility: hiddenId === slot.id ? 'hidden' : undefined }}
                    onClick={(e) => {
                      setHiddenId(slot.id);
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
                        sizes="200px"
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
          </div>
        );
      })}

      <MustEatImageLightbox
        imageUrl={expanded?.imageUrl ?? ''}
        alt={expanded?.alt ?? ''}
        originRect={expanded?.rect ?? null}
        onClose={() => setExpanded(null)}
        onExitComplete={handleExitComplete}
      />
    </div>
  );
}
