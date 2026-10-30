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
  /** Der Bezirk eines Platzes, wie ihn die Seite zählt. Ohne: das freie
   *  `district` des Lokals. */
  groupOf?: (m: MapMustEat) => string;
  /** Erst wenn die Daten dieses Besuchs da sind, zeigt das Band die Zahl und
   *  die Kartenhand; bis dahin hält es nur seinen Platz. */
  countReady?: boolean;
}

/* Das Album: eine Seite pro Bezirk, darin die Karten in der gedruckten
   Nummernfolge. Kein Zähler und kein Fortschritt — der Bestand wächst, und
   offene wie verdeckte Plätze zeigen von selbst, was fehlt. */
export default function ProfileAlbum({ mustEats, faceUpIds, groupOf, countReady = true }: Props) {
  const t = useTranslations('profile');
  const { slots: allSlots, groups } = useMemo(
    () => buildAlbum(mustEats, faceUpIds, groupOf),
    [mustEats, faceUpIds, groupOf]
  );
  const collected = allSlots.filter((slot) => slot.collected).length;
  /* Die Hand im Zählerband: drei offene Karten, die mit der höchsten Nummer. */
  const handSlots = allSlots.filter((slot) => slot.collected && slot.mustEat?.image).slice(-3);
  const [expanded, setExpanded] = useState<{
    imageUrl: string;
    placeholderUrl: string | null;
    alt: string;
    rect: DOMRect;
    id: string;
    open: boolean;
    where: string | null;
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

  const openZoom = (slot: (typeof allSlots)[number], element: HTMLElement) => {
    const open = slot.collected && !!slot.mustEat?.image;
    setExpanded({
      imageUrl: (open && slot.mustEat?.image) || CARD_BACK,
      /* Das Raster laedt nur Daumennaegel — der Zoom fliegt
         mit dem, was schon auf dem Schirm liegt, und holt
         das Original nach. */
      placeholderUrl: element.querySelector('img')?.currentSrc || null,
      alt: (open ? slot.mustEat?.dish : undefined) ?? '',
      rect: element.getBoundingClientRect(),
      id: slot.id,
      open,
      where: slot.where ?? null,
    });
  };

  const renderSlot = (slot: (typeof allSlots)[number]) => {
    const open = slot.collected && !!slot.mustEat?.image;
    const alt = (open ? slot.mustEat?.dish : undefined) ?? '';
    return (
      <button
        key={slot.id}
        type="button"
        aria-label={
          open
            ? alt
            : [`${t('albumCard')}${slot.no ? ` ${slot.no}` : ''}`, slot.where, slot.district]
                .filter(Boolean)
                .join(', ')
        }
        className={`${styles.slot} ${open ? styles.filled : styles.empty}`}
        style={{ visibility: hiddenId === slot.id ? 'hidden' : undefined }}
        onClick={(e) => openZoom(slot, e.currentTarget)}
      >
        {open && slot.mustEat?.image ? (
          <>
            {/* The protected image route authorizes the browser's
                HttpOnly capability cookie. next/image's internal
                optimizer does not forward that cookie, so private
                album art must load directly. */}
            {/* Eigener `key`, damit React beim Aufdecken ein NEUES <img> baut, statt das
                der Rückseite umzuschreiben: sonst setzt es nacheinander src,
                srcset, sizes, und Safari wählt bei jedem Schritt neu — erst die
                360er, dann (srcset ohne sizes = 100vw) die 720er, und lädt jede
                Karte doppelt. */}
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
          /* Verdeckt bleibt der Kartenrücken — aber der Platz sagt, wohin
             man muss: Nummer und Spot stehen auf dem Rücken, der Bezirk als
             Titel der Seite. Das Gericht bleibt auf dem Server
             (stripCoveredMustEats). */
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key="back" className={styles.backImg} src={CARD_BACK} alt="" loading="lazy" />
            <span className={styles.coveredLabels} aria-hidden="true">
              {slot.where && (
                <span className={`et-label-title et-label-tape ${styles.coveredName}`}>
                  {slot.where}
                </span>
              )}
            </span>
          </>
        )}
      </button>
    );
  };

  return (
    <div className={styles.panel}>
      {allSlots.length > 0 && (
        <div className={styles.hand}>
          <p
            className={styles.handCount}
            role="progressbar"
            aria-label={t('collectionProgress', { done: collected, total: allSlots.length })}
            aria-valuemin={0}
            aria-valuemax={allSlots.length}
            aria-valuenow={collected}
            aria-busy={!countReady}
          >
            <strong aria-hidden="true">{countReady ? collected : '\u00a0'}</strong>
            <span
              className={styles.handTotal}
              aria-hidden="true"
              style={countReady ? undefined : { visibility: 'hidden' }}
            >
              {t('albumCount', { total: allSlots.length })}
            </span>
          </p>
          {countReady && handSlots.length > 0 && (
            <span className={styles.handFan} aria-hidden="true">
              {handSlots.map((slot) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={slot.id}
                  src={mustEatCardSrc(slot.mustEat?.image ?? '', 180)}
                  srcSet={mustEatCardSrcSet(slot.mustEat?.image ?? '')}
                  sizes="112px"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </span>
          )}
        </div>
      )}
      {allSlots.length === 0 ? (
        <p className={styles.emptyText}>{t('emptyMustEats')}</p>
      ) : (
        groups.map((group, index) => (
          <section
            key={group.group}
            className={styles.page}
            aria-labelledby={`album-page-${index}`}
          >
            <h2 id={`album-page-${index}`} className={styles.pageTitle}>
              {group.group}
            </h2>
            <div className={styles.grid}>{group.slots.map(renderSlot)}</div>
          </section>
        ))
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
              className={`et-btn et-btn-alt ${styles.zoomLink}`}
              onClick={() => setExpanded(null)}
            >
              {/* Verdeckt zeigt der Zoom nur den Rücken: der Knopf nennt den Spot. */}
              <span className={styles.zoomLinkText}>
                {expanded.open
                  ? t('albumOpenSpot')
                  : expanded.where
                    ? t('albumToSpot', { name: expanded.where })
                    : t('albumOpenMap')}
              </span>
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
