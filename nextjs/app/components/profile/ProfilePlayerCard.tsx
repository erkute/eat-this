'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import styles from './ProfileAlbum.module.css';

interface Props {
  name: string;
  avatarIdx: number;
  /** Fehlt auf dem geteilten Deck — dort aendert niemand etwas, und die
   *  Karte ist dann kein Knopf, sondern ein Bild. */
  onPick?: () => void;
  /** Die Karte eines FREMDEN — in der Freundesreihe. Dann ist sie ein Weg
   *  auf dessen Deck, kein Knopf und kein Bild. Schliesst `onPick` aus:
   *  am eigenen Charakter aendert man nichts von einer fremden Karte aus. */
  href?: string;
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
 * Am 04.09.2026 bekam sie einen Punktestand („10/25", gelb auf Ink), am
 * 06.09.2026 ist er wieder weg — auf beiden Seiten (Nutzer: „das braucht es
 * nicht, es reicht, wenn man die Karten sieht: aufgedeckt und nicht
 * aufgedeckt"). Er stand auf der Figur und beantwortete eine Frage, die
 * niemand an dieser Stelle stellt. Wo der Stand jetzt steht: im eigenen
 * Profil auf dem „Alle"-Reiter, den er ohnehin doppelte; auf dem geteilten
 * Deck als Satz neben der Karte.
 *
 * Kein „Aendern"-Zeichen mehr unter der Karte (Nutzer, 04.09.2026: „wenn man
 * auf den Charakter klickt, kann man ihn ja waehlen — den Knopf brauchst du
 * gar nicht"). Es war die Beschriftung eines Knopfes, der schon eine Figur
 * ist; der zugaengliche Name des Knopfes sagt es weiter.
 */
export default function ProfilePlayerCard({ name, avatarIdx, onPick, href }: Props) {
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
    </span>
  );

  if (href) {
    return (
      <Link className={styles.player} href={href}>
        {inner}
      </Link>
    );
  }

  if (!onPick) return <div className={styles.player}>{inner}</div>;

  return (
    <button type="button" className={styles.player} onClick={onPick} aria-label={t('changeAvatar')}>
      {inner}
    </button>
  );
}
