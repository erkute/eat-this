'use client';
import { useTranslations } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import styles from './MapListEmpty.module.css';

interface Props {
  onReset?: () => void;
  /** Die Suchanfrage, wenn eine läuft. Entscheidet, welcher der beiden
   *  Leerzustände gilt — siehe unten. */
  query?: string;
}

/**
 * Nichts gefunden.
 *
 * ZWEI Zustände, nicht einer. Vorher stand hier ein Text für beide Fälle, und
 * der Knopf hieß immer „Filter zurücksetzen" — auch für jemanden, der gar
 * keinen Filter gesetzt, sondern nur etwas eingetippt hatte. Wer sucht, will
 * seinen Suchbegriff loswerden; wer filtert, seine Filter. Beides räumt
 * derselbe Handler ab, aber der Knopf muss benennen, was der Fall ist.
 *
 * Die Suchvariante nennt die Anfrage beim Namen. „Nichts gefunden" allein
 * lässt offen, ob man sich vertippt hat oder ob es das wirklich nicht gibt.
 *
 * Es gab hier mal eine dritte Variante — „0 freie Treffer, N stecken in einem
 * Pack" — für einen Filter, der nur bezahlte Spots traf. Die Liste trägt die
 * inzwischen selbst (Entscheidung 25.08.2026), ein Filter hat also entweder
 * Zeilen oder gar nichts im Katalog, und aus einem leeren Bildschirm heraus
 * gibt es nichts zu verkaufen. Das Pack-Angebot steht unter der letzten Zeile,
 * wo es etwas zu wollen gibt.
 */
export default function MapListEmpty({ onReset, query }: Props) {
  const { t } = useTranslation();
  /* Für die eine Zeile mit Platzhalter direkt next-intl: der `t` aus
     lib/i18n nimmt nur einen Schlüssel, keine Werte. Dasselbe Paar nutzt
     MustEatDetailMobile. */
  const tMap = useTranslations('map');
  const suche = (query ?? '').trim();
  const istSuche = suche.length > 0;

  return (
    <div className={styles.esBlock} role="status">
      <span className={styles.esKicker}>
        {t(istSuche ? 'map.emptyKickerSearch' : 'map.emptyKickerFilter')}
      </span>
      <h3 className={styles.esHeading}>{t('map.emptyTitle')}</h3>
      <p className={styles.esSub}>
        {istSuche ? tMap('emptyBodySearch', { query: suche }) : t('map.emptyBodyFilter')}
      </p>
      {onReset && (
        <div className={styles.esActions}>
          <button type="button" className={styles.esBtnPrimary} onClick={onReset}>
            {t(istSuche ? 'map.emptyResetSearch' : 'map.emptyReset')}
          </button>
        </div>
      )}
    </div>
  );
}
