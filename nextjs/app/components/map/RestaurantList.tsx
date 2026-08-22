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
import { categoryArt } from '@/lib/categoryArt';
import { CATALOG } from '@/lib/stripe-catalog';
import { formatPackPrice } from '@/lib/pack/packDetail';
import { normalizeName } from '@/lib/normalizeName';
import sanityImageLoader from '@/lib/sanityImageLoader';
import { prefetchRestaurantDetail } from '@/lib/map/useRestaurantDetail';
import { useLoginModal } from '@/lib/auth';
import MapListEmpty from './MapListEmpty';
import styles from './RestaurantList.module.css';

/* All-Berlin has no art of its own, so the banner fans out every category pack
   the way /packs and the locked-spot sheet do — nine bags say "everything" in a
   way one generic bag cannot. */
const ALL_BERLIN_ART = Object.values(CATALOG)
  .filter((pack) => pack.type === 'category' && pack.slug)
  .map((pack) => categoryArt(pack.slug as string))
  .filter((src): src is string => Boolean(src));

const ALL_BERLIN_PRICE = formatPackPrice(CATALOG['all-berlin'].amountCents);

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
  /** A paywalled spot, rendered as a row so a search can hand it back.
   *
   *  Deliberately NOT marked as locked — no badge, no grey photo, no heading
   *  above the block (user decision, 22.08.2026: the markers read as an ad).
   *  The row is the search result; the paywall is what the click reveals.
   *
   *  So this flag is purely behavioural now, and both parts must stay: no
   *  must-eat peek and no detail prefetch, because either would ship paid
   *  content for a spot nobody paid for. */
  locked?: boolean;
  onClick: (r: MapRestaurant) => void;
}

// `resolvePeek` returns a fresh object per render, so the memo comparison
// checks it by value — everything else is identity-stable from the parent.
function peekEqual(a: Peek, b: Peek): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind !== 'open' || b.kind !== 'open' || a.image === b.image;
}

const Item = memo(
  function Item({ restaurant, isSelected, peek, now, priority, locked, onClick }: ItemProps) {
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
      if (locked || !el || typeof IntersectionObserver === 'undefined') return;
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
    }, [restaurant.slug, locked]);

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
              /* 700 sitzt zwischen 600 und 900, weil genau dort die häufigste
                 Android-Klasse landet: 94vw auf 412px bei DPR 1.75 sind 677px
                 — ohne die Stufe griff der Browser zu 900w und lud rund ein
                 Drittel zu viel. */
              srcSet={[400, 600, 700, 900, 1200]
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

        {!locked && peek.kind !== 'none' && (
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
    prev.locked === next.locked &&
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
  /** Paywalled matches to render as rows, after the free ones. Non-empty only
   *  while a search query is active: a query is someone naming a spot, and
   *  answering "not found" for something that is in the catalogue — and whose
   *  name is public on its district page anyway — is the bug this fixes. The
   *  chip filters keep the quiet free-only list. */
  lockedRestaurants?: MapRestaurant[];
  /** Count of locked spots matching the active filter, for the empty state
   *  headline. Independent of `lockedRestaurants`: the chip filters count them
   *  without listing them. */
  lockedMatchCount?: number;
  /** What the active filter narrowed to (query, bezirk, cuisine or category),
   *  for the empty-state headline. */
  activeFilterLabel?: string | null;
}

export default function RestaurantList({
  restaurants,
  lockedRestaurants = [],
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

  // The empty state is for a filter that found NOTHING — neither free rows nor
  // locked ones to list. A search that matches only locked spots no longer
  // lands here: those rows are rendered below, which is the whole point of
  // being able to search the grey spots. The chip filters still reach it with
  // a locked count, because they don't list their locked matches.
  if (restaurants.length === 0 && lockedRestaurants.length === 0)
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
      {/* Locked hits last, and otherwise indistinguishable — they simply
          continue the list. Free rows stay on top because they are what the
          user can open today; ordering is the only weighting left. */}
      {lockedRestaurants.map((r, index) => (
        <div key={r._id} className={styles.rcardSlot}>
          <Item
            restaurant={r}
            isSelected={selectedId === r._id}
            /* LCP candidate only when no free row sits above it. */
            priority={restaurants.length === 0 && index === 0}
            now={now}
            peek={{ kind: 'none' }}
            locked
            onClick={onSelect}
          />
        </div>
      ))}
      {showAllBerlinBanner && (
        <div className={styles.listEnd}>
          <a href={allBerlinHref} className={styles.listEndOffer}>
            <p className={styles.listEndKicker}>{t('map.listEndKicker')}</p>
            <span className={styles.listEndPrice}>{ALL_BERLIN_PRICE}</span>
            <span className={styles.listEndFan} aria-hidden="true">
              {ALL_BERLIN_ART.map((src) => (
                <img
                  key={src}
                  className={styles.listEndPack}
                  src={src}
                  alt=""
                  width={420}
                  height={630}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              ))}
            </span>
            <h3 className={styles.listEndTitle}>{t('map.listEndTitle')}</h3>
            <p className={styles.listEndSub}>{t('map.listEndSub')}</p>
            <span className={styles.listEndCta}>
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
            </span>
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
