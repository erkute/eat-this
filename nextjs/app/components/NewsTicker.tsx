'use client';

import { useEffect, useRef } from 'react';

interface NewsTickerProps {
  titles: string[];
}

// Imperative DOM mounting because the legacy CSS marquee animation
// depends on a duplicated children layout in `.news-ticker-track`.
// React never owns these children.
export default function NewsTicker({ titles }: NewsTickerProps) {
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    let ticker = slot.querySelector<HTMLDivElement>('.news-ticker');
    if (!ticker) {
      ticker = document.createElement('div');
      ticker.className = 'news-ticker';
      ticker.setAttribute('aria-hidden', 'true');
      slot.appendChild(ticker);
    }
    if (!titles.length) {
      ticker.textContent = '';
      return;
    }
    const track = document.createElement('div');
    track.className = 'news-ticker-track';
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
