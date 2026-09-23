'use client';
import { useTranslations } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import styles from './MapListEmpty.module.css';

interface Props {
  /** Die Suchanfrage, wenn eine läuft. */
  query?: string;
  /** Hält mindestens ein Chip einen Wert? */
  filtersActive?: boolean;
  /** Räumt die Chips ab, die Anfrage bleibt. */
  onResetFilters?: () => void;
  /** Leert die Suche, die Chips bleiben. */
  onClearSearch?: () => void;
}

/**
 * Nichts gefunden.
 *
 * DREI Zustände, weil Suche und Chips zusammen filtern (seit 23.09.2026):
 * nur Suche, nur Filter, beides. Wer sucht, will seinen Suchbegriff loswerden;
 * wer filtert, seine Filter. Der Knopf benennt, was er abräumt, und räumt auch
 * nur das ab.
 *
 * Bei beidem gehen die Filter, die Anfrage bleibt: sie ist das, was man gerade
 * getippt hat. Findet sie auch ohne Filter nichts, landet man im Suchzustand
 * und kann sie dort löschen — ein Schritt pro Zustand.
 *
 * Die Suchvarianten nennen die Anfrage beim Namen. „Nichts gefunden" allein
 * lässt offen, ob man sich vertippt hat oder ob es das wirklich nicht gibt.
 *
 * Es gab hier mal eine weitere Variante — „0 freie Treffer, N stecken in einem
 * Pack" — für einen Filter, der nur bezahlte Spots traf. Die Liste trägt die
 * inzwischen selbst (Entscheidung 25.08.2026), ein Filter hat also entweder
 * Zeilen oder gar nichts im Katalog, und aus einem leeren Bildschirm heraus
 * gibt es nichts zu verkaufen. Das Pack-Angebot steht unter der letzten Zeile,
 * wo es etwas zu wollen gibt.
 */
export default function MapListEmpty({
  query,
  filtersActive = false,
  onResetFilters,
  onClearSearch,
}: Props) {
  const { t } = useTranslation();
  /* Für die Zeilen mit Platzhalter direkt next-intl: der `t` aus lib/i18n
     nimmt nur einen Schlüssel, keine Werte. Dasselbe Paar nutzt
     MustEatDetailMobile. */
  const tMap = useTranslations('map');
  const suche = (query ?? '').trim();
  const istSuche = suche.length > 0;

  const zustand = istSuche ? (filtersActive ? 'both' : 'search') : 'filter';
  const kicker = {
    both: t('map.emptyKickerBoth'),
    search: t('map.emptyKickerSearch'),
    filter: t('map.emptyKickerFilter'),
  }[zustand];
  const text = {
    both: tMap('emptyBodyBoth', { query: suche }),
    search: tMap('emptyBodySearch', { query: suche }),
    filter: t('map.emptyBodyFilter'),
  }[zustand];
  const onReset = zustand === 'search' ? onClearSearch : onResetFilters;

  return (
    <div className={styles.esBlock} role="status">
      <span className={styles.esKicker}>{kicker}</span>
      <h3 className={styles.esHeading}>{t('map.emptyTitle')}</h3>
      <p className={styles.esSub}>{text}</p>
      {onReset && (
        <div className={styles.esActions}>
          <button type="button" className={styles.esBtnPrimary} onClick={onReset}>
            {t(zustand === 'search' ? 'map.emptyResetSearch' : 'map.emptyReset')}
          </button>
        </div>
      )}
    </div>
  );
}
