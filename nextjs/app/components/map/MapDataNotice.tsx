'use client';

import { useTranslations } from 'next-intl';
import styles from './MapControls.module.css';

interface Props {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  onRetry: () => void;
}

/** Persistent map-payload status. Cached/SSR rows remain usable on refresh
 * failures, but are explicitly labelled as stale instead of looking current. */
export default function MapDataNotice({ loading, error, hasData, onRetry }: Props) {
  const t = useTranslations('map');
  if (!loading && !error) return null;

  const copy = error
    ? hasData
      ? t('dataStale')
      : t('dataError')
    : hasData
      ? t('dataRefreshing')
      : t('dataLoading');

  return (
    <div
      className={`${styles.mapStatusLayer}${error ? ` ${styles.mapStatusLayerError}` : ''}`}
      role={error ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className={styles.mapStatusText}>{copy}</span>
      {error && (
        <button type="button" className={styles.mapStatusAction} onClick={onRetry}>
          {t('dataRetry')}
        </button>
      )}
    </div>
  );
}
