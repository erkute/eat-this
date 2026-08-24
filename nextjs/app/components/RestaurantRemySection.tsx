'use client';

// "Frag Remy" auf der Restaurant-Seite — dasselbe Vokabular wie die Bühne auf
// der Startseite (HubFragRemy): eigener Layer auf ruhigem Panel, Providence-
// Titel, Chips UND Eingabefeld. Nur kompakter, weil die Seite redaktionell ist
// und Remy sie nicht überstimmen soll.
//
// Nichts von der Chat-Maschinerie lädt mit der Seite: Chips und Formular
// schicken nur ein BUDDY_ASK_EVENT (RemyDock mountet das Widget beim ersten),
// und Hover/Fokus wärmt den Chunk vor, damit das Panel beim Tap schon da ist.
//
// Die Fragen sind auf DIESEN Spot gebunden: das Widget schickt den Seiten-Slug,
// die API löst ihn serverseitig auf, Remy antwortet über das Restaurant, das
// der Nutzer gerade liest — ohne Rückfrage.

import { useState } from 'react';
import Image from 'next/image';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import { preloadBuddyWidget } from '@/app/components/buddy/RemyDock';
import styles from './RestaurantRemySection.module.css';

interface Props {
  locale: 'de' | 'en';
  /** Restaurant display name, already normalized by the page. */
  name: string;
  /** Bezirk name for the "something similar" chip; chip is dropped without it. */
  bezirk?: string;
}

export default function RestaurantRemySection({ locale, name, bezirk }: Props) {
  const de = locale === 'de';
  const [draft, setDraft] = useState('');

  const chips: string[] = [
    de ? 'Was bestell ich hier am besten?' : 'What should I order here?',
    ...(bezirk ? [de ? `Was Ähnliches in ${bezirk}?` : `Something similar in ${bezirk}?`] : []),
    de ? 'Lohnt sich der Weg?' : 'Is it worth the trip?',
  ];

  const placeholder = de ? `Frag mich was zu ${name}…` : `Ask me about ${name}…`;
  const sendLabel = de ? 'Senden' : 'Send';

  function submitDraft() {
    const q = draft.trim();
    if (!q) return;
    dispatchBuddyAsk({ question: q });
    setDraft('');
  }

  return (
    <section className={styles.section} aria-label={de ? 'Frag Remy' : 'Ask Remy'}>
      <div className={styles.panel} onPointerEnter={() => void preloadBuddyWidget()}>
        <div className={styles.avatarWrap}>
          <Image
            className={styles.face}
            src="/buddy/buddy-smile.webp"
            alt=""
            width={440}
            height={440}
            sizes="(max-width: 700px) 132px, 190px"
            loading="lazy"
          />
        </div>

        {/* Zweizeilig wie die Bühne auf der Startseite („Keine Idee? / Frag
            Remy."), nur mit der Frage, die auf einer Restaurantseite
            tatsächlich offen ist. Eigenes Rasterfeld, damit die Überschrift auf
            dem Telefon neben Remy stehen kann, während der Fliesstext darunter
            die volle Breite bekommt. */}
        {/* „Noch was offen?" stand hier und las sich auf einer Restaurantseite
            wie die Frage nach den Öffnungszeiten. */}
        <h2 className={styles.title}>
          <span className={styles.titleLine}>{de ? 'Unsicher?' : 'Not sure?'}</span>
          <span className={styles.titleLine}>{de ? 'Frag Remy.' : 'Ask Remy.'}</span>
        </h2>

        <div className={styles.copy}>
          {/* Ein Satz, der den Markenclaim aufnimmt („We tell you what to eat")
              und ihn auf diesen Spot zieht. Hier stand vorher ein
              Feature-Absatz im Werbeton — der erklärte den Dienst, statt Lust
              zu machen. */}
          <p className={styles.lead}>
            {de
              ? `Er war schon da und weiß, was du bei ${name} bestellen musst.`
              : `He's been there. He knows what to order at ${name}.`}
          </p>
        </div>

        {/* Chips und Eingabe laufen über die volle Panelbreite unter beidem
            durch — als schmale Spalte neben Remy wären die Fragen umbrochen
            und das Eingabefeld halb so breit wie sein Platzhalter. */}
        <div className={styles.actions}>
          <div className={styles.chips}>
            {chips.map((q) => (
              <button
                key={q}
                type="button"
                className={styles.chip}
                onFocus={() => void preloadBuddyWidget()}
                onClick={() => dispatchBuddyAsk({ question: q })}
              >
                {q}
              </button>
            ))}
          </div>

          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              submitDraft();
            }}
          >
            <input
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => void preloadBuddyWidget()}
              placeholder={placeholder}
              aria-label={placeholder}
            />
            <button className={styles.send} type="submit" aria-label={sendLabel}>
              <span aria-hidden="true">{sendLabel}</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
