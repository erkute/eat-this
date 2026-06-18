'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { MapMustEat } from '@/lib/types';
import MustEatImageLightbox from '@/app/components/map/MustEatImageLightbox';
import styles from './ProfileSlim.module.css';

interface Props {
  /** Per-user map payload — covered cards arrive stripped (no dish/image),
   *  which is fine: they render the card-back + restaurant label only. */
  mustEats: MapMustEat[];
  mapUnlockedIds: Set<string>;
  /** Restaurant IDs the user owns (their map tier). Drives which must-eats
   *  appear here: every must-eat of an owned spot, face-up if revealed,
   *  face-down ("Verdeckt") if still to be discovered. */
  ownedRestaurantIds: Set<string>;
}

// Collected must-eats: unlocked cards face-up (the trading-card art has the
// name baked in), curated-but-locked cards face-down as "Verdeckt · <spot>".
// What-is-a-Must-Eat explainer copy (mockup screen 15/16) lives in the
// profile.* dictionary — reveal happens by map proximity, not by tapping here.
export default function ProfileMustEats({ mustEats, mapUnlockedIds, ownedRestaurantIds }: Props) {
  const t = useTranslations('profile');
  const tCovered = useTranslations('mustEats');
  // Every must-eat that belongs to a spot the user owns — split into revealed
  // (face-up) and still-covered (face-down). Spots the user doesn't own don't
  // appear here at all.
  const ownedMustEats = useMemo(
    () =>
      mustEats
        .filter((m) => ownedRestaurantIds.has(m.restaurant._id))
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)),
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
        <h2 className={styles.sectionHeading}>{t('collectedHeading')}</h2>
      </div>
      <div className={styles.explainer}>
        <p className={styles.explainerKicker}>{t('explainerKicker')}</p>
        <p className={styles.explainerLine}>{t('explainer')}</p>
      </div>
      {ownedMustEats.length > 0 && (
        <p className={styles.meCount}>
          {t('collectedCount', { x: unlocked.length, y: ownedMustEats.length })}
        </p>
      )}
      {ownedMustEats.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyLine}>{t('emptyMustEats')}</p>
          <Link href="/#hub-packs" className={styles.emptyCta}>{t('packsCta')}</Link>
        </div>
      ) : (
        <div className={styles.meDeck}>
          {unlocked.length > 0 && (
            <section className={styles.meGroup}>
              <h3 className={styles.meGroupTitle}>{t('revealedSubhead')}</h3>
              <div className={`${styles.meGrid} ${styles.meGridOpen}`}>
                {unlocked.map((m) => (
                  <button
                    key={m._id}
                    type="button"
                    className={`${styles.me} ${styles.meBtn}`}
                    style={{ visibility: hiddenId === m._id ? 'hidden' : undefined }}
                    onClick={(e) => {
                      setHiddenId(m._id);
                      setExpanded({ imageUrl: m.image ?? '', alt: m.dish ?? '', rect: e.currentTarget.getBoundingClientRect(), id: m._id });
                    }}
                  >
                    <div className={styles.mePh}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.image} alt={m.dish ?? ''} loading="lazy" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {locked.length > 0 && (
            <section className={styles.meGroup}>
              <h3 className={styles.meGroupTitle}>{t('lockedSubhead')}</h3>
              <div className={`${styles.meGrid} ${styles.meGridLocked}`}>
                {locked.map((m) => {
                  // Covered card → its spot on the map. Prefer the restaurant detail
                  // (?r=) so you land ON the restaurant; fall back to the must-eat
                  // deep-link if the slug is missing.
                  const href = m.restaurant.slug ? `/map?r=${m.restaurant.slug}` : `/map?me=${m._id}`;
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
                        <img src="/pics/card-back.webp?v=6" alt={tCovered('covered')} loading="lazy" />
                      </div>
                      <div className={styles.meLabel}>
                        <h4 className={styles.meName}>{tCovered('covered')}</h4>
                        <div className={styles.meRest}>{m.restaurant.name}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

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
