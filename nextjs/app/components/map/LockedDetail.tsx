'use client';
import type { CSSProperties, Ref } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import type { MapRestaurant } from '@/lib/types';
import { abbreviateBezirk } from '@/lib/map';
import { formatPackPrice, packUrlSlug, resolvePackByUrlSlug } from '@/lib/pack/packDetail';
import { categoryArt } from '@/lib/categoryArt';
import { CATALOG } from '@/lib/stripe-catalog';
import { normalizeName } from '@/lib/normalizeName';
import { useTranslation } from '@/lib/i18n';
import { trackEvent } from '@/lib/analytics';
import { CloseIcon } from './icons';
import styles from './MapDetails.module.css';
import lockedStyles from './LockedDetail.module.css';

interface Props {
  restaurant: MapRestaurant;
  /** Whole-catalog spot count, not the filtered map — the all-Berlin offer's
   *  size must not move when the user ticks a chip. */
  totalSpots: number;
  contentRef: Ref<HTMLDivElement | null>;
  onClose: () => void;
}

/**
 * What a locked spot opens instead of a detail sheet.
 *
 * Tapping a grey dot used to navigate straight to /pack/all-berlin. That threw
 * away the map, the filter and the search for what is usually a "what is this?"
 * tap — and with a 28px target among 194 dots, a fair share of those taps are
 * mistakes. This answers the question in place and leaves both routes open.
 *
 * It names the restaurant, because the name is not a secret: the same spot is
 * readable on its district list and on /restaurant/<slug>. Only the map layer
 * is paid, so hiding the name here would protect nothing and would make the
 * paywall look like it covers more than it does.
 *
 * It does NOT link to that page. Those restaurant articles exist for search,
 * and pointing a paying-curious visitor at "read this one for free" sells
 * against the pack sitting right above it (user decision, 2026-08-19).
 *
 * The offer leads with the pack this spot is actually in — the 2,99 € one that
 * unlocks it — and puts all-Berlin underneath.
 *
 * Only all-Berlin states a spot count. A category pack's count invites exactly
 * the comparison that sinks the bundle: Lunch alone is 205 of 345 spots, so
 * "205 Spots · 2,99 €" next to "340 Spots · 20 €" argues against the 20 €
 * every time (user decision, 2026-08-19).
 */
export default function LockedDetail({ restaurant: r, totalSpots, contentRef, onClose }: Props) {
  const locale = useLocale();
  const { t } = useTranslation();
  const de = locale !== 'en';
  const district = abbreviateBezirk(r.bezirk?.name ?? r.district ?? null);
  const cuisine = r.cuisineType ?? null;
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;

  /* First category that maps to a real pack. A spot can carry several; the
     first is the one its card already shows. */
  const categoryPack = (r.categories ?? [])
    .map((c) => resolvePackByUrlSlug(c.slug))
    .find((pack) => pack !== null && pack.slug !== null);
  const allBerlin = resolvePackByUrlSlug('all-berlin');
  const spotsWord = de ? 'Spots' : 'spots';
  /* All-Berlin has no art of its own. /packs answers that by fanning out every
     category pack, and this does the same — nine bags say "everything" in a way
     one generic bag cannot. */
  const allBerlinArt = Object.values(CATALOG)
    .filter((pack) => pack.type === 'category' && pack.slug)
    .map((pack) => categoryArt(pack.slug as string))
    .filter((src): src is string => Boolean(src));
  const heroStyle = r.photo ? ({ backgroundImage: `url(${r.photo})` } as CSSProperties) : undefined;

  return (
    <div
      className={styles.detailV13}
      data-detail-root="locked"
      role="dialog"
      aria-label={normalizeName(r.name)}
    >
      <div className={styles.detailV13Scroll} data-detail-scroll ref={contentRef}>
        <header className={styles.rdHero} data-detail-hero style={heroStyle}>
          <button
            type="button"
            className={styles.rdCloseGlass}
            aria-label={de ? 'Schließen' : 'Close'}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
          <div className={styles.rdOverlay}>
            <h1 className={styles.rdNameOv}>{normalizeName(r.name)}</h1>
            <div className={styles.rdTagsOv}>
              {district && <span className={styles.rdTag}>{district}</span>}
              {cuisine && <span className={styles.rdTagAlt}>{cuisine}</span>}
            </div>
          </div>
        </header>

        <div className={lockedStyles.body}>
          <p className={lockedStyles.kicker}>{t('map.lockedDetailKicker')}</p>
          <p className={lockedStyles.lead}>
            {de ? 'Liegt noch nicht auf deiner Map.' : 'Not on your map yet.'}
          </p>
          <p className={lockedStyles.sub}>
            {de
              ? 'Mit einem Pack schaltest du diesen Spot frei — und alle anderen darin gleich mit.'
              : 'A pack unlocks this spot — and every other one in it.'}
          </p>
          {categoryPack?.slug && categoryArt(categoryPack.slug) && (
            <a
              className={`${lockedStyles.offer} ${lockedStyles.offerRow}`}
              href={`${prefix}/pack/${packUrlSlug(categoryPack)}`}
              onClick={() =>
                trackEvent('locked_spot_pack_clicked', {
                  restaurant_id: r._id,
                  restaurant_slug: r.slug,
                  pack_id: categoryPack.packId,
                })
              }
            >
              <span className={lockedStyles.offerArt}>
                <Image
                  className={lockedStyles.offerPack}
                  src={categoryArt(categoryPack.slug)!}
                  alt=""
                  width={420}
                  height={630}
                  sizes="88px"
                />
              </span>
              <span className={lockedStyles.offerPrice}>
                {formatPackPrice(categoryPack.amountCents)}
              </span>
              <span className={lockedStyles.offerText}>
                <span className={lockedStyles.offerLabel}>{categoryPack.displayName}</span>
                <span className={lockedStyles.offerSpectrum}>
                  {categoryPack.spectrum[de ? 'de' : 'en']}
                </span>
              </span>
            </a>
          )}
          {allBerlin && allBerlinArt.length > 0 && (
            <a
              className={lockedStyles.offer}
              href={`${prefix}/pack/all-berlin`}
              onClick={() =>
                trackEvent('locked_spot_pack_clicked', {
                  restaurant_id: r._id,
                  restaurant_slug: r.slug,
                  pack_id: allBerlin.packId,
                })
              }
            >
              <span className={`${lockedStyles.offerArt} ${lockedStyles.offerFan}`}>
                {allBerlinArt.map((src) => (
                  <Image
                    key={src}
                    className={lockedStyles.offerPack}
                    src={src}
                    alt=""
                    width={420}
                    height={630}
                    sizes="56px"
                  />
                ))}
              </span>
              <span className={lockedStyles.offerPrice}>
                {formatPackPrice(allBerlin.amountCents)}
              </span>
              <span className={lockedStyles.offerText}>
                <span className={lockedStyles.offerLabel}>
                  {`${de ? 'Ganz Berlin' : 'All Berlin'} · ${totalSpots} ${spotsWord}`}
                </span>
                <span className={lockedStyles.offerSpectrum}>
                  {allBerlin.spectrum[de ? 'de' : 'en']}
                </span>
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
