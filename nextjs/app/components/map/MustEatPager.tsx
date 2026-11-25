import { useTranslations } from 'next-intl';
import styles from './MustEatPager.module.css';

interface Props {
  position?: { index: number; count: number };
  onPrevious?: () => void;
  onNext?: () => void;
  previousName?: string | null;
  nextName?: string | null;
  alternateButtons?: boolean;
}

export default function MustEatPager({
  position,
  onPrevious,
  onNext,
  previousName,
  nextName,
  alternateButtons = false,
}: Props) {
  const t = useTranslations('map');
  const buttonClass = alternateButtons ? 'et-btn et-btn-sm et-btn-alt' : 'et-btn et-btn-sm';
  const previous = t('pagerPrev');
  const next = t('pagerNext');

  return (
    <div className={styles.pager} role="group" aria-label={t('pagerAria')}>
      {(onPrevious || onNext) && (
        <button
          type="button"
          className={buttonClass}
          aria-label={previousName ? `${previous}: ${previousName}` : previous}
          aria-disabled={!onPrevious}
          onClick={onPrevious}
        >
          {t('pagerPrevShort')}
        </button>
      )}
      <span className={styles.counter} role="status">
        {position && position.count > 1 && (
          <>
            <span aria-hidden="true">{position.index} / {position.count}</span>
            <span className={styles.announcement}>{t('pagerPosition', position)}</span>
          </>
        )}
      </span>
      {(onPrevious || onNext) && (
        <button
          type="button"
          className={buttonClass}
          aria-label={nextName ? `${next}: ${nextName}` : next}
          aria-disabled={!onNext}
          onClick={onNext}
        >
          {t('pagerNextShort')}
        </button>
      )}
    </div>
  );
}
