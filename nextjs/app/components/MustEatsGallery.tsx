'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { resolveUnlockedMustEatIds } from '@/lib/map';
import { useTranslation } from '@/lib/i18n';
import LazyMustEatImageLightbox from '@/app/components/map/LazyMustEatImageLightbox';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import type { MapMustEat } from '@/lib/types';
import styles from './MustEatsSection.module.css';

const CARD_BACK = '/pics/card-back.webp?v=7';

export interface GalleryCopy {
  openKicker: string;
  openTitle: string;
  openBody: string;
  coveredKicker: string;
  coveredTitle: string;
  coveredBody: string;
  coveredSpotsLabel: string;
}

interface Props {
  initialMapData: InitialMustEatsData;
  /** Composed on the server: the headings carry live counts, and the shared
   *  t() cannot format ICU placeholders. See MustEatsSection. */
  copy: GalleryCopy;
}

export default function MustEatsGallery({ initialMapData, copy }: Props) {
  const { t } = useTranslation();

  // Deterministic public catalog: every visitor — guest or signed-in — sees
  // the same anon view (10 curated cards + spot-of-day face-up, rest covered).
  // The personal collection lives in the profile; this page never
  // personalizes. Pure function of `initialMapData` → identical on server and
  // client, no hydration risk.
  const faceUp = useMemo(
    () =>
      resolveUnlockedMustEatIds({
        uid: null,
        storedUnlockedIds: new Set<string>(),
        revealedMustEatIds: new Set<string>(initialMapData.revealedMustEatIds),
      }),
    [initialMapData]
  );

  // Two bands instead of three filter chips. The chips were a utility control
  // on a page whose job is to sell the cards, and they answered a question the
  // layout can answer by itself: face-up cards belong together (a solid block
  // of dish photography), the card backs belong together (a wall of sealed
  // cards reads as "there is a lot more in here" — interleaved with the dish
  // art the same backs read as a broken checkerboard).
  // The catalog arrives pre-ordered face-up first, so the bands keep that order.
  const open = useMemo(
    () => initialMapData.mustEats.filter((m) => faceUp.has(m._id)),
    [initialMapData, faceUp]
  );
  const covered = useMemo(
    () => initialMapData.mustEats.filter((m) => !faceUp.has(m._id)),
    [initialMapData, faceUp]
  );
  // One list behind the zoom, both bands in sequence: paging with the arrows
  // runs from the last dish straight into the sealed cards, which is the story
  // the page tells anyway.
  const visible = useMemo(() => [...open, ...covered], [open, covered]);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  // The covered cards carry no dish, but their spot is public — the map's
  // locked list already names it. Spelled out under the wall of backs, the
  // names are the strongest piece of advertising on the page.
  const coveredSpots = useMemo(() => {
    const names: string[] = [];
    for (const m of covered) {
      if (!names.includes(m.restaurant.name)) names.push(m.restaurant.name);
    }
    return names;
  }, [covered]);

  /* Die Slots im Raster — aus ihnen fliegt die Karte heraus und in sie fliegt
     sie zurück. */
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const cardFace = useCallback(
    (m: MapMustEat) => {
      const isOpen = faceUp.has(m._id);
      return {
        imageUrl: (isOpen && m.image) || CARD_BACK,
        alt: (isOpen ? m.dish : undefined) ?? t('mustEats.covered'),
      };
    },
    [faceUp, t]
  );

  // Tap a card → deck-style fly-out zoom (same lightbox the profile deck and
  // the map detail use). Works for open cards (the dish art) AND locked cards
  // (the card-back). Tapping the zoomed card flies it back to its slot.
  const [expanded, setExpanded] = useState<{
    imageUrl: string;
    alt: string;
    rect: DOMRect;
    id: string;
  } | null>(null);
  // The origin card is hidden while its zoomed clone is on screen so it doesn't
  // show twice; revealed again in onExitComplete — the same frame the fly-back
  // clone unmounts — so there's no blink between clone and origin.
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const handleOpenReady = useCallback(() => {
    const current = expandedRef.current;
    if (current) setHiddenId(current.id);
  }, []);
  const closeExpanded = () => setExpanded(null);
  /* Im Zoom durch die Karten blättern — gewischt, geklickt oder mit den
     Pfeiltasten. Der Zoom selbst kennt die Reihenfolge nicht: er meldet nur
     die Richtung, hier steht die Liste. */
  const pageTo = useCallback(
    (delta: number) => {
      const current = expandedRef.current;
      if (!current) return;
      const list = visibleRef.current;
      const index = list.findIndex((m) => m._id === current.id);
      const target = list[index + delta];
      if (!target) return;
      const slot = cardRefs.current.get(target._id);
      if (!slot) return;
      const face = cardFace(target);
      setExpanded({ ...face, rect: slot.getBoundingClientRect(), id: target._id });
      // Der neue Ursprung verschwindet, der alte kommt im selben Zug zurück.
      setHiddenId(target._id);
    },
    [cardFace]
  );
  const expandedIndex = expanded ? visible.findIndex((m) => m._id === expanded.id) : -1;
  const handleExitComplete = () => {
    // If another card was opened mid fly-back, its origin must stay hidden.
    if (!expandedRef.current) setHiddenId(null);
  };

  const renderCard = (m: MapMustEat) => {
    const isOpen = faceUp.has(m._id);
    const { imageUrl, alt } = cardFace(m);
    return (
      <button
        key={m._id}
        type="button"
        ref={(el) => {
          if (el) cardRefs.current.set(m._id, el);
          else cardRefs.current.delete(m._id);
        }}
        className={styles.medish}
        // Both faces are the same object — a complete card artwork, drawn
        // freestanding — so the face is data, not a style hook.
        data-face={isOpen ? 'up' : 'down'}
        style={{ visibility: hiddenId === m._id ? 'hidden' : undefined }}
        onClick={(e) => {
          setExpanded({
            imageUrl,
            alt,
            rect: e.currentTarget.getBoundingClientRect(),
            id: m._id,
          });
        }}
      >
        <div className={styles.ph}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={alt} loading="lazy" />
        </div>
      </button>
    );
  };

  return (
    <>
      {open.length > 0 && (
        <section className={styles.band} data-band="open">
          {/* This header defines the term. It deliberately does NOT repeat the
              count: the head already states it and the grid shows it. */}
          <header className={styles.bandHead}>
            <p className={styles.bandKicker}>{copy.openKicker}</p>
            <h2 className={styles.bandTitle}>{copy.openTitle}</h2>
            <p className={styles.bandBody}>{copy.openBody}</p>
          </header>
          <div className={styles.grid}>{open.map(renderCard)}</div>
        </section>
      )}

      {covered.length > 0 && (
        <section className={styles.band} data-band="covered">
          <header className={styles.bandHead}>
            <p className={styles.bandKicker}>{copy.coveredKicker}</p>
            <h2 className={styles.bandTitle}>{copy.coveredTitle}</h2>
            <p className={styles.bandBody}>{copy.coveredBody}</p>
          </header>
          {/* Smaller and denser than the face-up band on purpose: at this size
              the repetition of the card back stops reading as a rendering
              fault and starts reading as a sealed deck. */}
          <div className={styles.gridDense}>{covered.map(renderCard)}</div>
          {coveredSpots.length > 0 && (
            <p className={styles.spotList}>
              <span className={styles.spotListLabel}>{copy.coveredSpotsLabel}</span>
              {coveredSpots.join(' · ')}
            </p>
          )}
        </section>
      )}

      <LazyMustEatImageLightbox
        active={Boolean(expanded || hiddenId)}
        imageUrl={expanded?.imageUrl ?? null}
        alt={expanded?.alt ?? ''}
        originRect={expanded?.rect ?? null}
        onClose={closeExpanded}
        onOpenReady={handleOpenReady}
        onExitComplete={handleExitComplete}
        onPrev={() => pageTo(-1)}
        onNext={() => pageTo(1)}
        hasPrev={expandedIndex > 0}
        hasNext={expandedIndex >= 0 && expandedIndex < visible.length - 1}
        position={
          expandedIndex >= 0 ? { index: expandedIndex + 1, count: visible.length } : undefined
        }
      />
    </>
  );
}
