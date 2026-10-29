'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import LazyMustEatImageLightbox from '@/app/components/map/LazyMustEatImageLightbox';
import MapIntentLink from '@/app/components/MapIntentLink';
import type { MapMustEat } from '@/lib/types';
import { buildAlbum } from '@/lib/profile/mustEatAlbum';
import { mustEatCardSrc, mustEatCardSrcSet } from '@/lib/must-eat/cardImage';
import styles from './ProfileAlbum.module.css';

const CARD_BACK = '/pics/card-back.webp?v=20261028';
// Vollständig sichtbare Albumplätze: vier Spalten am Desktop, zwei am Telefon.
const GRID_SIZES =
  '(max-width: 767.98px) calc((100vw - 50px) / 2), (max-width: 1440px) 22vw, 330px';
interface Props {
  mustEats: MapMustEat[];
  faceUpIds: Set<string>;
  nextMove?: React.ReactNode;
}

// Alle Karten stehen in der gedruckten Nummernfolge im Album.
export default function ProfileAlbum({ mustEats, faceUpIds, nextMove }: Props) {
  const t = useTranslations('profile');
  const { slots: allSlots } = useMemo(() => buildAlbum(mustEats, faceUpIds), [mustEats, faceUpIds]);
  const collected = allSlots.filter((slot) => slot.collected).length;
  const [expanded, setExpanded] = useState<{
    imageUrl: string;
    placeholderUrl: string | null;
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
      <div className={styles.deckIntro}>
        <div className={styles.collectionHead}>
          <h2 className={styles.collectionTitle}>{t('albumHeading')}</h2>
          {allSlots.length > 0 && (
            <div
              className={styles.collectionProgress}
              role="progressbar"
              aria-label={t('collectionProgress', { done: collected, total: allSlots.length })}
              aria-valuemin={0}
              aria-valuemax={allSlots.length}
              aria-valuenow={collected}
            >
              <div className={styles.collectionCount} aria-hidden="true">
                <strong>{collected}</strong>
                <span className={styles.collectionTotal}>/ {allSlots.length}</span>
              </div>
              <div className={styles.collectionTrack} aria-hidden="true">
                {allSlots.map((slot, index) => (
                  <span key={slot.id} data-filled={index < collected} />
                ))}
              </div>
            </div>
          )}
        </div>
        {nextMove && <div className={styles.albumMove}>{nextMove}</div>}
      </div>
      {allSlots.length === 0 ? (
        <p className={styles.emptyText}>{t('emptyMustEats')}</p>
      ) : (
        <div className={styles.grid}>
          {allSlots.map((slot) => {
            const open = slot.collected && !!slot.mustEat?.image;
            const imageUrl = (open && slot.mustEat?.image) || CARD_BACK;
            const alt = (open ? slot.mustEat?.dish : undefined) ?? '';
            return (
              <button
                key={slot.id}
                type="button"
                aria-label={open ? alt : `${t('albumCard')}${slot.no ? ` ${slot.no}` : ''}`}
                className={`${styles.slot} ${open ? styles.filled : styles.empty}`}
                style={{ visibility: hiddenId === slot.id ? 'hidden' : undefined }}
                onClick={(e) => {
                  setExpanded({
                    imageUrl,
                    /* Das Raster laedt nur Daumennaegel — der Zoom fliegt
                           mit dem, was schon auf dem Schirm liegt, und holt
                           das Original nach. */
                    placeholderUrl: e.currentTarget.querySelector('img')?.currentSrc || null,
                    alt,
                    rect: e.currentTarget.getBoundingClientRect(),
                    id: slot.id,
                  });
                }}
              >
                {open && slot.mustEat?.image ? (
                  <>
                    {/* The protected image route authorizes the browser's
                        HttpOnly capability cookie. next/image's internal
                        optimizer does not forward that cookie, so private
                        album art must load directly. */}
                    {/* Eigener `key`, damit React beim Aufdecken ein NEUES
                        <img> baut, statt das der Rueckseite umzuschreiben: dann
                        setzt es nacheinander src, srcset, sizes, und Safari
                        waehlt bei jedem Schritt neu — erst die 360er, dann
                        (srcset ohne sizes = 100vw) die 720er. Ein iPhone lud so
                        jede Karte doppelt (Prod-Log 26.09.2026). Chrome waehlt
                        einmal und zeigt es nicht. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key="card"
                      src={mustEatCardSrc(slot.mustEat.image, 360)}
                      srcSet={mustEatCardSrcSet(slot.mustEat.image)}
                      sizes={GRID_SIZES}
                      alt=""
                      className={styles.img}
                      loading="lazy"
                      decoding="async"
                    />
                  </>
                ) : (
                  /* Verdeckt bleibt nur der Kartenrücken. Der Spot ist
                     nach dem Antippen über den Zoom erreichbar. */
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key="back"
                      className={styles.backImg}
                      src={CARD_BACK}
                      alt=""
                      loading="lazy"
                    />
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      <LazyMustEatImageLightbox
        active={Boolean(expanded || hiddenId)}
        imageUrl={expanded?.imageUrl ?? null}
        alt={expanded?.alt ?? ''}
        placeholderUrl={expanded?.placeholderUrl ?? null}
        originRect={expanded?.rect ?? null}
        action={
          expanded ? (
            <MapIntentLink
              href={`/map?me=${encodeURIComponent(expanded.id)}`}
              rel="nofollow"
              className="et-btn et-btn-alt"
              onClick={() => setExpanded(null)}
            >
              {t('albumOpenDetail')}
            </MapIntentLink>
          ) : null
        }
        onClose={() => setExpanded(null)}
        onOpenReady={handleOpenReady}
        onExitComplete={handleExitComplete}
      />
    </div>
  );
}
