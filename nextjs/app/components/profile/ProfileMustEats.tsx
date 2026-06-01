'use client';

import { useMemo, useState } from 'react';
import type { MustEatAlbumCard } from '@/lib/types';
import { selectTeaserOrders } from '@/lib/profile/teasers';
import MustEatImageLightbox from '@/app/components/map/MustEatImageLightbox';
import styles from './ProfileSlim.module.css';

interface Props {
  mustEats: MustEatAlbumCard[];
  mapUnlockedIds: Set<string>;
  curatedRevealedIds: string[];
}

// What is a Must Eat — explainer copy (mockup screen 15/16). Reveal happens by
// map proximity, not by tapping here, so locked cards are static "Verdeckt".
const EXPLAINER =
  'Eat This kuratiert die besten Orte Berlins — und für ausgewählte Spots gibt’s das passende Must Eat gleich mit. Manche siehst du sofort, andere sind verdeckt: komm einem verdeckten Spot nah, dreht sich die Karte von selbst auf.';

// Collected must-eats: unlocked cards face-up (the trading-card art has the
// name baked in), curated-but-locked cards face-down as "Verdeckt · <spot>".
export default function ProfileMustEats({ mustEats, mapUnlockedIds, curatedRevealedIds }: Props) {
  const curatedSet = useMemo(() => new Set(curatedRevealedIds), [curatedRevealedIds]);
  const unlocked = useMemo(
    () => mustEats.filter((m) => mapUnlockedIds.has(m._id)),
    [mustEats, mapUnlockedIds],
  );
  const lockedOrders = useMemo(
    () => selectTeaserOrders(mustEats, mapUnlockedIds, curatedSet),
    [mustEats, mapUnlockedIds, curatedSet],
  );
  const locked = useMemo(
    () => mustEats.filter((m) => typeof m.order === 'number' && lockedOrders.has(m.order)),
    [mustEats, lockedOrders],
  );

  // Tap an unlocked card → deck-style fly-out lightbox (same as the old deck).
  const [expanded, setExpanded] = useState<{ imageUrl: string; alt: string; rect: DOMRect } | null>(null);

  return (
    <>
      <div className={styles.section}>
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
            onClick={(e) =>
              setExpanded({ imageUrl: m.imageUrl, alt: m.dish, rect: e.currentTarget.getBoundingClientRect() })
            }
          >
            <div className={styles.mePh}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.imageUrl} alt={m.dish} loading="lazy" />
            </div>
          </button>
        ))}
        {locked.map((m) => (
          <article key={m._id} className={`${styles.me} ${styles.meLocked}`}>
            <div className={styles.mePh}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pics/card-back.webp?v=5" alt="Verdeckt" loading="lazy" />
            </div>
            <div className={styles.meLabel}>
              <h4 className={styles.meName}>Verdeckt</h4>
              <div className={styles.meRest}>{m.restaurant}</div>
            </div>
          </article>
        ))}
      </div>

      <MustEatImageLightbox
        imageUrl={expanded?.imageUrl ?? ''}
        alt={expanded?.alt ?? ''}
        originRect={expanded?.rect ?? null}
        onClose={() => setExpanded(null)}
      />
    </>
  );
}
