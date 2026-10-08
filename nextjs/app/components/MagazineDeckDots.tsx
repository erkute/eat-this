'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { DECK_CHANGE_EVENT, DECK_GO_EVENT } from '@/lib/home/magazineDeck';
import MagazineLink from './MagazineLink';
import styles from './MagazineGrid.module.css';

interface Props {
  /** id of the horizontal scroller the dots drive. */
  deckId: string;
  /** One accessible name per cover, in stack order. */
  labels: string[];
  stories: { title: string; href: string }[];
}

/**
 * Die Punkte unter dem Magazin-Stapel: welches Cover vorn liegt, und
 * antippbar — für Maus und Tastatur, die nicht quer wischen können. Am
 * Telefon färbt sie die Scroll-Timeline des Stapels, und ein Tipp scrollt
 * ihn an die Stelle. Ab 768px nimmt lib/home/magazineTable das Ereignis an,
 * teilt die Hefte bis dorthin aus und setzt `aria-current`.
 */
export default function MagazineDeckDots({ deckId, labels, stories }: Props) {
  const count = labels.length;
  const [active, setActive] = useState(0);
  useEffect(() => {
    const deck = document.getElementById(deckId);
    if (!deck) return;
    const table = window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)');
    const sync = () => setActive(Math.max(0, Math.min(count - 1,
      table.matches ? Number(deck.dataset.activeIndex ?? 0) : Math.round(deck.scrollLeft / (deck.clientWidth || 1)))));
    sync();
    deck.addEventListener('scroll', sync, { passive: true });
    deck.addEventListener(DECK_CHANGE_EVENT, sync);
    window.addEventListener('resize', sync);
    table.addEventListener('change', sync);
    return () => {
      deck.removeEventListener('scroll', sync);
      deck.removeEventListener(DECK_CHANGE_EVENT, sync);
      window.removeEventListener('resize', sync);
      table.removeEventListener('change', sync);
    };
  }, [deckId, count]);
  const go = (n: number) => {
    const deck = document.getElementById(deckId);
    if (!deck) return;
    const go = new CustomEvent(DECK_GO_EVENT, { detail: n, cancelable: true });
    if (!deck.dispatchEvent(go)) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    deck.scrollTo({ left: n * deck.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  };
  return (
    <div className={styles.storyControls}>
    <div className={styles.storyCaption} data-magazine-caption="" aria-live="polite" aria-atomic="true">
      <span className={styles.storyNumber}>{String(active + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span>
      <h3>
        <MagazineLink href={stories[active].href} coverFrom={`#${deckId} [data-deck-index="${active}"] a`}>
          {stories[active].title}
        </MagazineLink>
      </h3>
    </div>
    <div className={styles.dots}>
      {labels.map((label, n) => (
        <button
          key={n}
          type="button"
          className={styles.dot}
          data-deck-dot=""
          style={{ '--dot-keys': `mag-dot-${count}-${n}` } as CSSProperties}
          aria-label={label}
          aria-current={active === n ? 'true' : undefined}
          onClick={() => go(n)}
        />
      ))}
    </div>
    </div>
  );
}
