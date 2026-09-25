'use client';

// "Frag Remy" als Chat-Einstieg auf redaktionellen Seiten — dasselbe Vokabular
// wie die Bühne auf der Startseite (HubFragRemy): eigener Layer auf ruhigem
// Panel, Providence-Titel, Chips UND Eingabefeld. Nur kompakter, weil die Seite
// redaktionell ist und Remy sie nicht überstimmen soll.
//
// Nichts von der Chat-Maschinerie lädt mit der Seite: Chips und Formular
// schicken nur ein BUDDY_ASK_EVENT (RemyDock mountet das Widget beim ersten),
// und Hover/Fokus wärmt den Chunk vor, damit das Panel beim Tap schon da ist.
//
// Was Remy sagt und welche Fragen er anbietet, bestimmt die Seite: auf einem
// Restaurant sind es Fragen zu genau diesem Spot, auf „Über uns" der Einstieg
// in die ganze Map.

import { useState } from 'react';
import Image from '@/app/components/SiteImage';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import { preloadBuddyWidget } from '@/app/components/buddy/RemyDock';
import styles from './RemyAskPanel.module.css';

interface Props {
  locale: 'de' | 'en';
  /** Zwei Halbsätze, je eine Zeile — „Keine Idee? / Frag Remy." */
  titleLines: [string, string];
  lead: string;
  chips: string[];
  placeholder: string;
  /** Breite und Abstand nach außen — die Tafel selbst bringt keine mit. */
  className?: string;
}

export default function RemyAskPanel({
  locale,
  titleLines,
  lead,
  chips,
  placeholder,
  className,
}: Props) {
  const de = locale === 'de';
  const [draft, setDraft] = useState('');
  const sendLabel = de ? 'Senden' : 'Send';

  function submitDraft() {
    const q = draft.trim();
    if (!q) return;
    dispatchBuddyAsk({ question: q });
    setDraft('');
  }

  return (
    <section className={className} aria-label={de ? 'Frag Remy' : 'Ask Remy'}>
      <div className={styles.panel} onPointerEnter={() => void preloadBuddyWidget()}>
        <div className={styles.avatarWrap}>
          <Image
            className={styles.face}
            src="/buddy/buddy-smile.webp"
            alt=""
            /* Die echten Maße der Datei: quadratisch angegeben reservierte der
               Browser zu wenig Höhe, und Remy wuchs beim Laden um 10px. */
            width={791}
            height={876}
            sizes="(max-width: 700px) 132px, 190px"
            loading="lazy"
          />
        </div>

        {/* Eigenes Rasterfeld, damit die Überschrift auf dem Telefon neben
            Remy stehen kann, während der Fliesstext darunter die volle Breite
            bekommt. */}
        <h2 className={styles.title}>
          <span className={styles.titleLine}>{titleLines[0]}</span>
          <span className={styles.titleLine}>{titleLines[1]}</span>
        </h2>

        <div className={styles.copy}>
          <p className={styles.lead}>{lead}</p>
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
