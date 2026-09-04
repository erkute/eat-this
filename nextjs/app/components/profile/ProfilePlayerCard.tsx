'use client';

import { useTranslations } from 'next-intl';
import styles from './ProfileAlbum.module.css';

interface Props {
  name: string;
  avatarIdx: number;
  onPick: () => void;
}

/**
 * Die eigene Karte — Prototyp, 04.09.2026.
 *
 * Der Kopf der Seite war eine 315 px hohe Tafel fuer drei Angaben: Name,
 * Berlin-Zahl, Figur. Auf dem Telefon ass sie 43 % des ersten Bildschirms,
 * und die Figur stand als kleiner Gegenstand in ihrer rechten Ecke.
 *
 * Statt eine Flaeche zu verkleinern, bekommt die Figur das Format, das diese
 * Seite ohnehin fuehrt: 1539/2115, dasselbe Seitenverhaeltnis wie jede Must-
 * Eat-Karte. Damit ist der Charakter kein Zubehoer mehr, sondern die erste
 * Karte des Albums — die Spielerkarte vor den Sammelkarten, wie das
 * Titelblatt eines Panini-Albums.
 *
 * Der Name steht AUF der Karte, nicht darunter (Nutzer, 04.09.2026: „der
 * Name ist da unten bloed platziert"). Unter der Karte war er eine
 * Bildunterschrift und stand damit auf derselben Stufe wie die
 * Gerichtnamen im Raster daneben; auf der Karte ist er das, was er ist —
 * ihre Beschriftung, wie der Spielername auf einer Sammelkarte.
 *
 * Die Berlin-Zahl ist ganz entfallen (Nutzer, 04.09.2026: „vielleicht
 * nimmst du die komplett raus"). Sie war der einzige Ort im Produkt, an
 * dem stand, wie viel von der Stadt diesem Konto gehoert — wer sie
 * zurueckholt, holt auch den stillen Verkaeufer fuer die Packs zurueck.
 *
 * Sie stand hier auf ausdruecklichen Wunsch (26.08.2026: „ein kleiner
 * Reiter, wo Berlin steht und wie viel Spots man schon freigeschaltet hat,
 * von wie vielen") — dieser Wunsch ist mit dem 04.09.2026 ueberholt, nicht
 * vergessen. Wer sie wieder aufnimmt: die gelbe Zahl auf Ink war bewusst
 * dieselbe Sprache wie der Belohnungs-Screen nach der Anmeldung, dort
 * waechst sie, hier stand sie. Der Bezug geht verloren, wenn man sie in
 * einer anderen Farbe zurueckbringt.
 */
export default function ProfilePlayerCard({ name, avatarIdx, onPick }: Props) {
  const t = useTranslations('profile');

  return (
    <button type="button" className={styles.player} onClick={onPick} aria-label={t('changeAvatar')}>
      <span className={styles.playerFrame}>
        {/* Das Bildfeld mit der Ink-Linie — die Figur bekommt einen Rahmen,
            die Karte selbst bleibt Papier. */}
        <span className={styles.playerField}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.playerImg} src={`/pics/avatar/${avatarIdx}.webp?v=3`} alt="" />
        </span>
        <span className={styles.playerName}>{name}</span>
      </span>
      {/* Unter der Karte, leise: das Zeichen gehoert zum Knopf, nicht zur
          Karte. Auf der Karte lag es vorher auf dem Fuss der Figur. */}
      <span className={styles.playerEdit} aria-hidden="true">
        {t('changeAvatarShort')}
      </span>
    </button>
  );
}
