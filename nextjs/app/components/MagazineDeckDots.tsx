'use client';

import type { CSSProperties } from 'react';
import { DECK_GO_EVENT } from '@/lib/home/magazineDeck';
import styles from './MagazineGrid.module.css';

interface Props {
  /** id of the horizontal scroller the dots drive. */
  deckId: string;
  /** One accessible name per cover, in stack order. */
  labels: string[];
}

/**
 * Die Punkte unter dem Magazin-Stapel: welches Cover vorn liegt, und
 * antippbar — für Maus und Tastatur, die nicht quer wischen können. Am
 * Telefon färbt sie die Scroll-Timeline des Stapels, und ein Tipp scrollt
 * ihn an die Stelle. Ab 768px nimmt lib/home/magazineTable das Ereignis an,
 * teilt die Hefte bis dorthin aus und setzt `aria-current`.
 */
export default function MagazineDeckDots({ deckId, labels }: Props) {
  const count = labels.length;
  const go = (n: number) => {
    const deck = document.getElementById(deckId);
    if (!deck) return;
    const go = new CustomEvent(DECK_GO_EVENT, { detail: n, cancelable: true });
    if (!deck.dispatchEvent(go)) return;
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
          data-deck-dot=""
          style={{ '--dot-keys': `mag-dot-${count}-${n}` } as CSSProperties}
          aria-label={label}
          onClick={() => go(n)}
        />
      ))}
    </div>
  );
}
