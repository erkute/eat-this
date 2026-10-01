'use client';

import type { CSSProperties } from 'react';
import styles from './MagazineGrid.module.css';

interface Props {
  /** id of the horizontal scroller the dots drive. */
  deckId: string;
  /** One accessible name per cover, in stack order. */
  labels: string[];
}

/**
 * Die Punkte unter dem Magazin-Stapel: welches Cover vorn liegt (das färbt
 * die Scroll-Timeline des Stapels, kein JS), und antippbar — für Maus und
 * Tastatur, die nicht quer wischen können. Ein Tipp scrollt den Stapel an
 * die Stelle; das Austeilen läuft dann dieselbe Strecke wie beim Wischen.
 */
export default function MagazineDeckDots({ deckId, labels }: Props) {
  const count = labels.length;
  const go = (n: number) => {
    const deck = document.getElementById(deckId);
    if (!deck) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    deck.scrollTo({ left: n * deck.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  };
  return (
    <div className={styles.dots}>
      {labels.map((label, n) => (
        <button
          key={n}
          type="button"
          className={styles.dot}
          style={{ '--dot-keys': `mag-dot-${count}-${n}` } as CSSProperties}
          aria-label={label}
          onClick={() => go(n)}
        />
      ))}
    </div>
  );
}
