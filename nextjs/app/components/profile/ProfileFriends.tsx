'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { auth } from '@/lib/firebase/config';
import type { FriendCard } from '@/lib/profile/friends';
import ProfilePlayerCard from './ProfilePlayerCard';
import styles from './Profile.module.css';

/**
 * Die Freunde, die über den eigenen Link gestartet sind — als Reihe von
 * Spielerkarten, jede ein Weg auf ihr Deck.
 *
 * Der Referral-Weg läuft seit dem ersten Tag, aber sichtbar war davon nur
 * eine nackte Zahl im Einladen-Kasten („3 Freunde sind über deinen Link
 * gestartet"). Wen man geworben hat, stand nirgends, und es gab keinen Weg
 * zu ihnen — obwohl `/deck/<uid>` genau die Seite ist, die es dafür braucht.
 * Damit schließt sich der Kreis: Deck teilen → Freund meldet sich an →
 * seine Figur steht hier → sein Deck ist einen Klick weit weg.
 *
 * Kein Social-Backend: die Kennungen stehen in den eigenen Bonus-Dokumenten,
 * Namen und Figuren holt `/api/friends` mit dem Admin-SDK — und zwar nur für
 * das Konto, dessen Token die Anfrage trägt (siehe friends.server.ts).
 *
 * Keine Karten, keine Zahlen neben den Figuren: was jemand gesammelt hat,
 * sagt seine eigene Deck-Seite, und die entscheidet selbst, was sie zeigt.
 * Eine zweite Stelle, die das behauptet, wäre eine zweite Zugriffsgrenze.
 *
 * Leer rendert der Abschnitt gar nichts. „Noch keine Freunde" wäre eine
 * Bilanz, die niemand sehen will — und der gelbe Kasten direkt darüber
 * fragt ohnehin schon danach.
 */
export default function ProfileFriends({ uid }: { uid: string | null }) {
  const t = useTranslations('profile');
  const [friends, setFriends] = useState<FriendCard[]>([]);

  useEffect(() => {
    if (!uid) {
      setFriends([]);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token || !active) return;
        const res = await fetch('/api/friends', { headers: { authorization: `Bearer ${token}` } });
        if (!res.ok || !active) return;
        const data = (await res.json()) as { friends?: unknown };
        if (!active || !Array.isArray(data.friends)) return;
        setFriends(data.friends as FriendCard[]);
      } catch {
        /* Kein Zustand für „ging nicht": der Abschnitt verschwindet dann
           einfach, und darunter steht die Seite unverändert weiter. */
      }
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  if (friends.length === 0) return null;

  return (
    <section className={`hv-section hv-wrap ${styles.section}`}>
      <div className={`hv-head ${styles.head}`}>
        <h2 className="hv-title">{t('friendsHeading')}</h2>
      </div>
      <p className={styles.friendsLine}>{t('friendsLine')}</p>

      {/* Der Container stellt die Kartengröße über eine Variable statt über
          einen Selektor: `.player` liegt in ProfileAlbum.module.css, und ein
          Modul-Selektor von hier aus gegen einen von dort hat denselben Rang —
          in Produktion gewinnt dann die Datei, die später lädt. Eine geerbte
          Custom Property kennt diesen Streit nicht. */}
      <ul className={styles.friends}>
        {friends.map((friend) => (
          <li key={friend.uid}>
            <ProfilePlayerCard
              name={friend.name ?? t('friendAnonymous')}
              avatarIdx={friend.avatar}
              href={`/deck/${friend.uid}`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
