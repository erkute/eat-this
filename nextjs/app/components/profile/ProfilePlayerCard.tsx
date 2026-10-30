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
 * Die eigene Karte: der Charakter im Format jeder Must-Eat-Karte (1539/2115)
 * als erste Karte des Albums — die Spielerkarte vor den Sammelkarten.
 *
 * Der Name steht auf der Karte, als ihre Beschriftung, wie der Spielername auf
 * einer Sammelkarte. Kein Punktestand und kein „Ändern"-Zeichen: ein Tipp auf
 * die Figur wechselt den Charakter, der zugängliche Name des Knopfes sagt es.
 * Den Stand zeigt das Profil im Zählerband des Decks, das geteilte Deck als
 * Satz neben der Karte.
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
