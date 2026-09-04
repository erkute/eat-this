'use client';

import { useTranslations } from 'next-intl';
import styles from './ProfileAlbum.module.css';

interface Props {
  name: string;
  avatarIdx: number;
  /** Der Punktestand auf der Karte: aufgedeckt von wie vielen. */
  done: number;
  total: number;
  /** Fehlt auf dem geteilten Deck — dort aendert niemand etwas, und die
   *  Karte ist dann kein Knopf, sondern ein Bild. */
  onPick?: () => void;
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
 * Seit dem Abend des 04.09.2026 traegt sie auch den Punktestand. Er stand
 * vorher als grosse Zahl am rechten Rand der Kopfzeile und sagte dasselbe wie
 * die Reiter darunter (Nutzer: „macht das dort oben Sinn, neben dem
 * Profil?"). Gelbe Zahl auf Ink — dieselbe Sprache wie der Belohnungs-Screen
 * nach der Anmeldung, wo sie waechst. Wer die Farbe hier aendert, loest den
 * Bezug zwischen den beiden Bildschirmen.
 *
 * Kein „Aendern"-Zeichen mehr unter der Karte (Nutzer, 04.09.2026: „wenn man
 * auf den Charakter klickt, kann man ihn ja waehlen — den Knopf brauchst du
 * gar nicht"). Es war die Beschriftung eines Knopfes, der schon eine Figur
 * ist; der zugaengliche Name des Knopfes sagt es weiter.
 */
export default function ProfilePlayerCard({ name, avatarIdx, done, total, onPick }: Props) {
  const t = useTranslations('profile');

  const inner = (
    <span className={styles.playerFrame}>
      {/* Das Bildfeld mit der Ink-Linie — die Figur bekommt einen Rahmen,
          die Karte selbst bleibt Papier. */}
      <span className={styles.playerField}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.playerImg} src={`/pics/avatar/${avatarIdx}.webp?v=4`} alt="" />
      </span>
      <span className={styles.playerName}>{name}</span>
      {total > 0 && (
        <span className={styles.playerScore}>
          <strong>{done}</strong>
          <span className={styles.playerScoreTotal}>/{total}</span>
        </span>
      )}
    </span>
  );

  if (!onPick) return <div className={styles.player}>{inner}</div>;

  return (
    <button type="button" className={styles.player} onClick={onPick} aria-label={t('changeAvatar')}>
      {inner}
    </button>
  );
}
