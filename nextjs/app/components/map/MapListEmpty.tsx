'use client';
import { useTranslation } from '@/lib/i18n';
import styles from './MapListEmpty.module.css';

interface Props {
  onReset?: () => void;
}

/**
 * Nothing matched.
 *
 * There used to be a second variant here — "0 freie Treffer, N stecken in
 * einem Pack" — for a filter that only hit paywalled spots. The list carries
 * those spots itself now (user decision 25.08.2026), so a filter either has
 * rows or it has nothing in the catalogue at all, and there is no count left
 * to name and no offer to make from an empty screen. The pack offer still sits
 * under the last row, where there is something to want.
 */
export default function MapListEmpty({ onReset }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.esBlock} role="status">
      <span className={styles.esKicker}>{t('map.emptyKicker')}</span>
      <h3 className={styles.esHeading}>{t('map.emptyTitle')}</h3>
      <p className={styles.esSub}>{t('map.emptyBody')}</p>
      {onReset && (
        <div className={styles.esActions}>
          <button type="button" className={styles.esBtnPrimary} onClick={onReset}>
            {t('map.emptyReset')}
          </button>
        </div>
      )}
    </div>
  );
}
