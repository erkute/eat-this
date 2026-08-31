'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import styles from './Profile.module.css';

/**
 * Wie viel von Berlin diesem Konto schon gehört — die eine Zahl, die das
 * ganze Produkt zusammenfasst (User-Wunsch, 26.08.2026: „ein kleiner Reiter,
 * wo Berlin steht und wie viel Spots man schon freigeschaltet hat, von wie
 * vielen").
 *
 * Gelbe Zahl auf Ink — dieselbe Sprache wie der Belohnungs-Screen nach der
 * Anmeldung, absichtlich: dort wächst die Zahl, hier steht sie. Wer die
 * Farbgebung hier ändert, löst den Bezug zwischen den beiden Bildschirmen.
 *
 * Sitzt seit 31.08.2026 IN der Ink-Bank des Kopfes statt als eigener
 * Abschnitt darunter: Figur, Name und diese Zahl beantworten dieselbe Frage
 * („wer bin ich, wo stehe ich"), standen dafür aber zwei Bildschirme
 * auseinander — und die Ink-Fläche war die einzige weit oben, die gelbe
 * Einladen-Fläche die einzige ganz unten.
 *
 * Kein Weg zur Map mehr an dieser Zeile (Nutzer, 31.08.2026: „muss es hier
 * sein?"). Der Knopf sass am rechten Rand der Textspalte und damit direkt
 * unter der Figur, las sich also als deren Zubehoer statt als Ausgang der
 * Berlin-Zeile. Und er war der dritte Weg zur Map auf einem Bildschirm: die
 * SiteNav fuehrt oben links dauerhaft hin, der naechste Zug direkt darunter
 * fuehrt sogar auf eine bestimmte Karte.
 *
 * Was bleibt, ist eine Angabe. Die Tafel hat damit genau zwei Knoepfe, und
 * jeder haengt an dem, worauf er wirkt: „Charakter aendern" an der Figur,
 * der naechste Zug an seinem Satz. Eine Zahl braucht keinen.
 *
 * Die Zahlen kommen von oben, nicht mehr aus einem eigenen useMapData:
 * ProfileShell hält denselben Hook ohnehin, der zweite Aufruf war ein zweiter
 * /api/map-data-Abruf für dieselbe Antwort. Bei totalCount 0 rendert die
 * Bank ohne diesen Block weiter — eine Null, die gleich von der echten Zahl
 * ersetzt würde, wäre eine Lüge auf Zeit.
 */
export default function ProfileCityProgress({ open, total }: { open: number; total: number }) {
  const t = useTranslations('profile');

  const pct = useMemo(
    () => (total > 0 ? Math.min(100, Math.round((open / total) * 100)) : 0),
    [open, total]
  );

  if (total === 0) return null;

  return (
    <div className={styles.city}>
      <p className={styles.cityKicker}>{t('cityKicker')}</p>
      <p className={styles.cityNumbers}>
        <span className={styles.cityOpen}>{open}</span>
        <span className={styles.cityTotal}>{t('cityCount', { total })}</span>
      </p>
      {/* Balken statt Prozentzahl: die Fläche sagt „da ist noch Stadt übrig"
          deutlicher als jede Ziffer — und sie ist der stille Verkäufer für
          die Packs, ohne hier eines zu nennen. */}
      <span className={styles.cityBar} aria-hidden="true">
        <span className={styles.cityBarFill} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
