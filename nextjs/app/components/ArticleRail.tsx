'use client';

import { useEffect, useRef, useState } from 'react';
import NewsArticleShare from './NewsArticleShare';
import styles from './ArticleRail.module.css';

export interface Chapter {
  id: string;
  text: string;
}

interface Props {
  chapters: Chapter[];
  label: string;
  shareLabel: string;
  shareCopiedLabel: string;
  shareTitle: string;
  shareExcerpt?: string;
}

// Sticky chapter rail for the article detail — desktop only (the module hides
// it below 1080px). It exists because the h2 anchors were already there and
// nothing pointed at them: a five-chapter guide had no way to be skimmed.
export default function ArticleRail({
  chapters,
  label,
  shareLabel,
  shareCopiedLabel,
  shareTitle,
  shareExcerpt,
}: Props) {
  const [activeId, setActiveId] = useState<string>(chapters[0]?.id ?? '');
  // The last heading that entered the top band stays lit while the reader is
  // between headings — otherwise the marker blanks out mid-chapter.
  const lastSeen = useRef(activeId);

  useEffect(() => {
    if (!chapters.length) return;
    const nodes = chapters
      .map((c) => document.getElementById(c.id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          lastSeen.current = entry.target.id;
        }
        // Among everything currently in the band, the topmost one wins.
        const inBand = nodes.filter((n) => {
          const r = n.getBoundingClientRect();
          return r.top <= 140 && r.bottom >= 0;
        });
        const next = inBand.length ? inBand[inBand.length - 1].id : lastSeen.current;
        setActiveId(next);
      },
      // A band just under the masthead, so a heading counts as "current" from
      // the moment it reaches reading position — not when it fills the screen.
      { rootMargin: '-96px 0px -68% 0px', threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [chapters]);

  if (!chapters.length) return null;

  // The page scrolls inside `.app-pages` on desktop, so a plain #hash does
  // nothing. scrollIntoView finds whichever ancestor actually scrolls.
  const jump = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    setActiveId(id);
  };

  return (
    <aside className={styles.rail} aria-label={label}>
      <div className={styles.sticky}>
        <span className={styles.label}>{label}</span>
        <ol className={styles.list}>
          {chapters.map((c, i) => {
            const isActive = c.id === activeId;
            return (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={(e) => jump(e, c.id)}
                >
                  <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.text}>{c.text}</span>
                </a>
              </li>
            );
          })}
        </ol>
        <NewsArticleShare
          title={shareTitle}
          excerpt={shareExcerpt}
          label={shareLabel}
          copiedLabel={shareCopiedLabel}
          className={styles.share}
        />
      </div>
    </aside>
  );
}
