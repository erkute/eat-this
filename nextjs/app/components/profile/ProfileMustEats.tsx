'use client';

import { useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { MustEatAlbumCard } from '@/lib/types';
import MustEatImageLightbox from '@/app/components/map/MustEatImageLightbox';
import styles from './ProfileSlim.module.css';

interface Props {
  mustEats: MustEatAlbumCard[];
  mapUnlockedIds: Set<string>;
  /** Restaurant IDs the user owns (their map tier). Drives which must-eats
   *  appear here: every must-eat of an owned spot, face-up if revealed,
   *  face-down ("Verdeckt") if still to be discovered. */
  ownedRestaurantIds: Set<string>;
}

// What is a Must Eat — explainer copy (mockup screen 15/16). Reveal happens by
// map proximity, not by tapping here, so locked cards are static "Verdeckt".
const EXPLAINER =
  'Eat This kuratiert die besten Orte Berlins — und für ausgewählte Spots gibt’s das passende Must Eat gleich mit. Manche siehst du sofort, andere sind verdeckt: komm einem verdeckten Spot nah, dreht sich die Karte von selbst auf.';

// Collected must-eats: unlocked cards face-up (the trading-card art has the
// name baked in), curated-but-locked cards face-down as "Verdeckt · <spot>".
export default function ProfileMustEats({ mustEats, mapUnlockedIds, ownedRestaurantIds }: Props) {
  // Every must-eat that belongs to a spot the user owns — split into revealed
  // (face-up) and still-covered (face-down). Spots the user doesn't own don't
  // appear here at all.
  const ownedMustEats = useMemo(
    () => mustEats.filter((m) => m.restaurantId != null && ownedRestaurantIds.has(m.restaurantId)),
    [mustEats, ownedRestaurantIds],
  );
  const unlocked = useMemo(
    () => ownedMustEats.filter((m) => mapUnlockedIds.has(m._id)),
    [ownedMustEats, mapUnlockedIds],
  );
  const locked = useMemo(
    () => ownedMustEats.filter((m) => !mapUnlockedIds.has(m._id)),
    [ownedMustEats, mapUnlockedIds],
  );

  // Tap an unlocked card → deck-style fly-out lightbox (same as the old deck).
  const [expanded, setExpanded] = useState<{ imageUrl: string; alt: string; rect: DOMRect; id: string } | null>(null);
  // Which grid card is visually hidden while its zoomed clone is on screen, so
  // it isn't shown twice (once in its slot, once zoomed). Revealed again in
  // onExitComplete — the same frame the fly-back clone unmounts — so there's
  // no blink between clone and origin (a timer left a visible gap).
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const closeExpanded = () => setExpanded(null);
  const handleExitComplete = () => {
    // If another card was opened mid fly-back, its origin must stay hidden.
    if (!expandedRef.current) setHiddenId(null);
  };

  return (
    <>
      <div
        className={styles.section}
        id="gesammelte-must-eats"
        style={{ scrollMarginTop: 'calc(72px + var(--staging-banner-h, 0px))' }}
      >
        <h2 className={styles.sectionHeading}>Gesammelte Must Eats</h2>
      </div>
      <div className={styles.explainer}>
        <p className={styles.explainerKicker}>Was ist ein Must Eat?</p>
        <p className={styles.explainerLine}>{EXPLAINER}</p>
      </div>
      <div className={styles.meGrid}>
        {unlocked.map((m) => (
          <button
            key={m._id}
            type="button"
            className={`${styles.me} ${styles.meBtn}`}
            style={{ visibility: hiddenId === m._id ? 'hidden' : undefined }}
            onClick={(e) => {
              setHiddenId(m._id);
              setExpanded({ imageUrl: m.imageUrl, alt: m.dish, rect: e.currentTarget.getBoundingClientRect(), id: m._id });
            }}
          >
            <div className={styles.mePh}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.imageUrl} alt={m.dish} loading="lazy" />
            </div>
          </button>
        ))}
        {locked.map((m) => {
          // Covered card → its spot on the map. Prefer the restaurant detail
          // (?r=) so you land ON the restaurant; fall back to the must-eat
          // deep-link if the slug is missing.
          const href = m.restaurantSlug ? `/map?r=${m.restaurantSlug}` : `/map?me=${m._id}`;
          return (
            <Link
              key={m._id}
              href={href}
              rel="nofollow"
              className={`${styles.me} ${styles.meLocked}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className={styles.mePh}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/pics/card-back.webp?v=5" alt="Verdeckt" loading="lazy" />
              </div>
              <div className={styles.meLabel}>
                <h4 className={styles.meName}>Verdeckt</h4>
                <div className={styles.meRest}>{m.restaurant}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <MustEatImageLightbox
        imageUrl={expanded?.imageUrl ?? ''}
        alt={expanded?.alt ?? ''}
        originRect={expanded?.rect ?? null}
        onClose={closeExpanded}
        onExitComplete={handleExitComplete}
      />
    </>
  );
}
