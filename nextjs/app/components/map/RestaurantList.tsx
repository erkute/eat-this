'use client';
import { memo, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import type { MapRestaurant, MapMustEat, OpenStatus } from '@/lib/types';
import {
  abbreviateBezirk,
  getOpenStatus,
  resolvePeek,
  type UserLocation,
  type UserTier,
  type Peek,
} from '@/lib/map';
import { useTranslation } from '@/lib/i18n';
import { localizedCategoryName } from '@/lib/categories';
import { normalizeName } from '@/lib/normalizeName';
import sanityImageLoader from '@/lib/sanityImageLoader';
import { prefetchRestaurantDetail } from '@/lib/map/useRestaurantDetail';
import { useLoginModal } from '@/lib/auth';
import MapListEmpty from './MapListEmpty';
import styles from './RestaurantList.module.css';

interface ItemProps {
  restaurant: MapRestaurant;
  isSelected: boolean;
  peek: Peek;
  /** Browser time, populated only after hydration. Keeping the SSR value null
   *  prevents Cloud Run's UTC clock and the visitor's local timezone from
   *  producing different opening-status markup during hydration. */
  now: Date | null;
  /** First row only: it is visible at the sheet's resting stop, so its photo
   *  is the LCP candidate and must not be lazy. */
  priority?: boolean;
  onClick: (r: MapRestaurant) => void;
}

// `resolvePeek` returns a fresh object per render, so the memo comparison
// checks it by value — everything else is identity-stable from the parent.
function peekEqual(a: Peek, b: Peek): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind !== 'open' || b.kind !== 'open' || a.image === b.image;
}

const Item = memo(
  function Item({ restaurant, isSelected, peek, now, priority, onClick }: ItemProps) {
    const { t, lang } = useTranslation();
    const loc = lang === 'de' ? 'de' : 'en';
    const statusLabels = {
      open: t('map.open'),
      closed: t('map.closed'),
      opens: t('map.opens'),
      closes: t('map.closes'),
      unitH: t('map.unitsH'),
      unitMin: t('map.unitsMin'),
    };
    const status: OpenStatus | null =
      now && restaurant.openingHours
        ? getOpenStatus(restaurant.openingHours, now, statusLabels)
        : null;

    // Prenzlauer Berg shortens to P'berg so the mustard sticker stays one line.
    const district = abbreviateBezirk(restaurant.bezirk?.name ?? restaurant.district ?? null);

    // One category in the eyebrow — the detail page is where the full set lives.
    const categoryLabel = restaurant.categories?.[0]
      ? localizedCategoryName(restaurant.categories[0], loc)
      : null;
    const [statusMain] = status?.label ? status.label.split(' · ') : [];

    // Warm the on-demand detail fields once a card scrolls near the viewport —
    // by the time the user taps it, the story text is already cached and the
    // detail opens complete (no skeleton).
    const cardRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
      const el = cardRef.current;
      if (!el || typeof IntersectionObserver === 'undefined') return;
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            prefetchRestaurantDetail(restaurant.slug);
            io.disconnect();
          }
        },
        { rootMargin: '300px 0px' }
      );
      io.observe(el);
      return () => io.disconnect();
    }, [restaurant.slug]);

    return (
      <button
        ref={cardRef}
        type="button"
        className={`${styles.rcard} ${isSelected ? styles.rcardActive : ''}`}
        onClick={() => onClick(restaurant)}
      >
        {/* Real <img> instead of a CSS background so the browser can natively
          lazy-load off-screen card photos (backgrounds always fetch eagerly). */}
        <div className={styles.rcardImg}>
          {restaurant.photo && (
            <img
              src={sanityImageLoader({ src: restaurant.photo, width: 600 })}
              /* One fixed 600px variant for every device was soft on a 3x
                 phone (the card is ~362 CSS px wide) and oversized for the
                 280px desktop column. */
              srcSet={[400, 600, 900, 1200]
                .map((w) => `${sanityImageLoader({ src: restaurant.photo!, width: w })} ${w}w`)
                .join(', ')}
              sizes="(max-width: 767.98px) 94vw, 280px"
              alt=""
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : undefined}
              decoding={priority ? 'sync' : 'async'}
              draggable={false}
            />
          )}
        </div>

        {statusMain && (
          <span
            className={`${styles.openPill} ${status?.isOpen ? '' : styles.openPillClosed}`}
            role="status"
          >
            {statusMain}
          </span>
        )}

        {peek.kind !== 'none' && (
          <span className={styles.mustPeek}>
            <img
              src={
                peek.kind === 'open'
                  ? sanityImageLoader({ src: peek.image, width: 180 })
                  : '/pics/card-back-sm.webp?v=6'
              }
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </span>
        )}

        <div className={styles.rcardBody}>
          <h3 className={styles.rcardName}>{normalizeName(restaurant.name)}</h3>
          <p className={styles.rcardMeta}>
            {district && (
              <span className={`${styles.rcardMetaChip} ${styles.rcardMetaDistrict}`}>
                <span>{district}</span>
              </span>
            )}
            {categoryLabel && (
              <span className={`${styles.rcardMetaChip} ${styles.rcardMetaCategory}`}>
                <span>{categoryLabel}</span>
              </span>
            )}
          </p>
        </div>
      </button>
    );
  },
  (prev, next) =>
    prev.restaurant === next.restaurant &&
    prev.isSelected === next.isSelected &&
    prev.now === next.now &&
    prev.onClick === next.onClick &&
    peekEqual(prev.peek, next.peek)
);

interface RestaurantListProps {
  restaurants: MapRestaurant[];
  userLocation: UserLocation | null;
  selectedId: string | null;
  uid: string | null;
  userTier: UserTier;
  onSelect: (r: MapRestaurant) => void;
  primaryMustEats: Map<string, MapMustEat>;
  unlockedIds: Set<string>;
  revealedMustEatIds: Set<string>;
  onResetFilters?: () => void;
  /** Uncapped count of locked spots matching the active filter — `lockedRestaurants`
   *  is capped at a 20-row teaser, so it cannot be counted for the empty state. */
  lockedMatchCount?: number;
  /** What the active filter narrowed to (query, bezirk, cuisine or category),
   *  for the empty-state headline. */
  activeFilterLabel?: string | null;
}

export default function RestaurantList({
  restaurants,
  selectedId,
  uid,
  userTier,
  onSelect,
  primaryMustEats,
  unlockedIds,
  revealedMustEatIds,
  onResetFilters,
  lockedMatchCount = 0,
  activeFilterLabel,
}: RestaurantListProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const { open: openLoginModal } = useLoginModal();
  const openSigninLogin = () => openLoginModal('signin');
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const allBerlinHref =
    locale === routing.defaultLocale ? '/pack/all-berlin' : `/${locale}/pack/all-berlin`;
  const districtsHref = locale === routing.defaultLocale ? '/bezirk' : `/${locale}/bezirk`;

  // Zero free rows always gets the empty state — it used to be gated on the
  // locked list being empty too, so a search that only matched locked spots
  // („Ramen": 0 free, 3 locked) fell through to the bare All-Berlin banner:
  // an empty surface plus a paywall, with no "0 hits" and no reason. The block
  // carries the pack CTA itself in that case, so the banner below would only
  // repeat it.
  if (restaurants.length === 0)
    return (
      <MapListEmpty
        onReset={onResetFilters}
        lockedCount={userTier === 'allBerlin' ? 0 : lockedMatchCount}
        filterLabel={activeFilterLabel}
        packHref={allBerlinHref}
        districtsHref={districtsHref}
      />
    );

  // One calm upsell only: no blurred locked rows and no separate signup
  // banner. Guests get sign-in as a secondary text link inside this block.
  const showAllBerlinBanner = userTier !== 'allBerlin';

  return (
    <>
      {restaurants.map((r, index) => (
        <div key={r._id} className={styles.rcardSlot}>
          <Item
            restaurant={r}
            isSelected={selectedId === r._id}
            /* The first row already peeks above the fold at the sheet's resting
               stop, so it is the map page's LCP candidate — lazy-loading it
               made the browser discover it a round-trip late. */
            priority={index === 0}
            now={now}
            // Beide Sets werden gebraucht: bei Anon-Nutzern enthält `unlockedIds` die
            // pre-revealed Must-Eat-IDs NICHT, daher prüft `resolvePeek` `revealedMustEatIds`
            // separat. Bei eingeloggten Nutzern ist `revealedMustEatIds` leer — harmloser No-op.
            peek={resolvePeek(primaryMustEats.get(r._id), unlockedIds, revealedMustEatIds)}
            onClick={onSelect}
          />
        </div>
      ))}
      {showAllBerlinBanner && (
        <div className={styles.listEnd}>
          <p className={styles.listEndKicker}>{t('map.listEndKicker')}</p>
          <h3 className={styles.listEndTitle}>{t('map.listEndTitle')}</h3>
          <div className={styles.listEndFan} aria-hidden="true">
            <span className={`${styles.listEndPack} ${styles.listEndPackOne}`} />
            <span className={`${styles.listEndPack} ${styles.listEndPackTwo}`} />
            <span className={`${styles.listEndPack} ${styles.listEndPackThree}`} />
            <span className={`${styles.listEndPack} ${styles.listEndPackFour}`} />
            <span className={`${styles.listEndPack} ${styles.listEndPackFive}`} />
            <span className={`${styles.listEndPack} ${styles.listEndPackSix}`} />
          </div>
          <p className={styles.listEndSub}>{t('map.listEndSub')}</p>
          <a href={allBerlinHref} className={styles.listEndCta}>
            <span>{t('map.listEndCta')}</span>
            <svg
              viewBox="0 0 14 10"
              width="15"
              height="11"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M1 5h11M8 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          {!uid && (
            <button type="button" className={styles.listEndSecondary} onClick={openSigninLogin}>
              {t('map.starterPromoLogin')}
            </button>
          )}
        </div>
      )}
    </>
  );
}
