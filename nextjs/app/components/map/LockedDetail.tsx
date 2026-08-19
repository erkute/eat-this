'use client';
import type { CSSProperties, Ref } from 'react';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import type { MapRestaurant } from '@/lib/types';
import { abbreviateBezirk } from '@/lib/map';
import { normalizeName } from '@/lib/normalizeName';
import { useTranslation } from '@/lib/i18n';
import { trackEvent } from '@/lib/analytics';
import { CloseIcon } from './icons';
import styles from './MapDetails.module.css';
import lockedStyles from './LockedDetail.module.css';

interface Props {
  restaurant: MapRestaurant;
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
 * readable for free on its district list and on /restaurant/<slug>. Only the
 * map layer is paid, so hiding the name here would protect nothing and would
 * make the paywall look like it covers more than it does.
 */
export default function LockedDetail({ restaurant: r, contentRef, onClose }: Props) {
  const locale = useLocale();
  const { t } = useTranslation();
  const de = locale !== 'en';
  const district = abbreviateBezirk(r.bezirk?.name ?? r.district ?? null);
  const cuisine = r.cuisineType ?? null;
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
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
          <p className={lockedStyles.kicker}>{t('map.emptyLockedKicker')}</p>
          <p className={lockedStyles.lead}>
            {de ? 'Liegt noch nicht auf deiner Map.' : 'Not on your map yet.'}
          </p>
          <p className={lockedStyles.sub}>
            {de
              ? 'Lesen kannst du ihn trotzdem — nur die Map kostet.'
              : 'You can still read it — only the map costs.'}
          </p>
          <a
            className={lockedStyles.btnPrimary}
            href={`${prefix}/pack/all-berlin`}
            onClick={() =>
              trackEvent('locked_spot_pack_clicked', {
                restaurant_id: r._id,
                restaurant_slug: r.slug,
              })
            }
          >
            {t('map.listEndCta')}
          </a>
          <a
            className={lockedStyles.btnSecondary}
            href={`${prefix}/restaurant/${r.slug}`}
            onClick={() =>
              trackEvent('locked_spot_read_clicked', {
                restaurant_id: r._id,
                restaurant_slug: r.slug,
              })
            }
          >
            {de ? 'Spot frei lesen' : 'Read this spot for free'}
          </a>
        </div>
      </div>
    </div>
  );
}
