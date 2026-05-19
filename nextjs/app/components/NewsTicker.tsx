'use client';

import { useEffect, useRef } from 'react';
import styles from './NewsTicker.module.css';

interface NewsTickerProps {
  titles: string[];
}

// Imperative DOM mount because the marquee animation depends on a duplicated
// children layout — React never owns these children directly.
export default function NewsTicker({ titles }: NewsTickerProps) {
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    let ticker = slot.querySelector<HTMLDivElement>(`.${styles.ticker}`);
    if (!ticker) {
      ticker = document.createElement('div');
      ticker.className = styles.ticker;
      ticker.setAttribute('aria-hidden', 'true');
      slot.appendChild(ticker);
    }
    if (!titles.length) {
      ticker.textContent = '';
      return;
    }
    const track = document.createElement('div');
    track.className = styles.track;
    [...titles, ...titles].forEach(title => {
      const span = document.createElement('span');
      span.textContent = title;
      track.appendChild(span);
    });
    ticker.textContent = '';
    ticker.appendChild(track);
  }, [titles]);

  return <div ref={slotRef} suppressHydrationWarning />;
}
