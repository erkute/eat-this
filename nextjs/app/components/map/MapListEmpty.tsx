'use client';
import { useTranslations } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import styles from './MapListEmpty.module.css';

interface Props {
  onReset?: () => void;
  /** Uncapped number of locked spots matching the active filter. > 0 switches
   *  the block from "there is nothing" to "there is something, it is locked" —
   *  the distinction the user cannot otherwise make from an empty surface. */
  lockedCount?: number;
  /** The filter term the zero applies to (query, bezirk, cuisine, category).
   *  Absent only when nothing but "open now" is active. */
  filterLabel?: string | null;
  /** All-Berlin pack link, rendered only in the locked variant. */
  packHref?: string;
  /** District index — the free way to read the spots the map is holding back. */
  districtsHref?: string;
}

export default function MapListEmpty({
  onReset,
  lockedCount = 0,
  filterLabel,
  packHref,
  districtsHref,
}: Props) {
  const { t } = useTranslation();
  // Legacy t() can't interpolate ICU values — parametrized keys go through
  // next-intl directly.
  const tMap = useTranslations('map');
  const locked = lockedCount > 0;

  const kicker = locked ? t('map.emptyLockedKicker') : t('map.emptyKicker');
  const heading = locked ? t('map.emptyLockedTitle') : t('map.emptyTitle');
  // The filter term rides in the body, not the headline — „0 FREIE TREFFER FÜR
  // „RAMEN“." ran to four lines of 32px display type at 375px.
  const body = locked
    ? filterLabel
      ? tMap('emptyLockedBody', { count: lockedCount, label: filterLabel })
      : tMap('emptyLockedBodyBare', { count: lockedCount })
    : t('map.emptyBody');

  return (
    <div className={styles.esBlock} role="status">
      <span className={styles.esKicker}>{kicker}</span>
      <h3 className={styles.esHeading}>{heading}</h3>
      <p className={styles.esSub}>{body}</p>
      {/* The paywall covers the map, not the writing. Without this line a
          locked-only search reads as broken rather than limited — the spots it
          "cannot find" are sitting on a free district page. */}
      {locked && districtsHref && (
        <p className={styles.esFree}>
          {t('map.emptyLockedFree')}{' '}
          <a className={styles.esFreeLink} href={districtsHref}>
            {t('map.emptyLockedFreeCta')}
          </a>
        </p>
      )}
      {(onReset || (locked && packHref)) && (
        <div className={styles.esActions}>
          {locked && packHref && (
            <a href={packHref} className={styles.esBtnPrimary}>
              {t('map.listEndCta')}
            </a>
          )}
          {onReset && (
            <button
              type="button"
              className={locked && packHref ? styles.esBtnSecondary : styles.esBtnPrimary}
              onClick={onReset}
            >
              {t('map.emptyReset')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
