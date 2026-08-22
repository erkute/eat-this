'use client';

import { useEffect, useState } from 'react';
import NewsArticleShare from './NewsArticleShare';
import styles from './ArticleRail.module.css';

/** Reading position: a chapter counts as current once its heading has passed
 *  this line, just below the 74px masthead. */
export const READING_LINE = 140;

/** The last chapter whose heading is at or above the reading line — or the
 *  first one while the reader is still above all of them. Headings without a
 *  node in the document are skipped rather than ending the scan, so one
 *  missing anchor cannot freeze the marker on everything after it.
 *
 *  Pure on purpose: this is the part that was wrong the first time round, and
 *  it is the part worth pinning down in a test. */
export function activeChapterId(
  ids: string[],
  topOf: (id: string) => number | null,
  line: number = READING_LINE
): string {
  let current = ids[0] ?? '';
  for (const id of ids) {
    const top = topOf(id);
    if (top === null) continue;
    if (top > line) break;
    current = id;
  }
  return current;
}

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
  // A stable dependency: `chapters` is rebuilt on every parent render, so
  // depending on the array itself would tear the listeners down each time.
  const chapterKey = chapters.map((c) => c.id).join('|');

  useEffect(() => {
    if (!chapterKey) return;
    const ids = chapterKey.split('|');
    let frame = 0;

    // Measured from positions, not from crossings. The first version used an
    // IntersectionObserver with a 153px-tall band (`rootMargin: -96px 0 -68%`)
    // and only recomputed inside its callback: a heading that jumped clear
    // over the band between two samples produced no entry at all, and the
    // marker then stayed put forever. Verified in production on a guide with
    // eight chapters — the plain observer fired twice over the same scroll,
    // the banded one only once, at attach time.
    const measure = () => {
      frame = 0;
      setActiveId(
        activeChapterId(ids, (id) => {
          const node = document.getElementById(id);
          return node ? node.getBoundingClientRect().top : null;
        })
      );
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    // `scroll` does not bubble, and on desktop the page scrolls inside
    // `.app-pages` rather than the window — so listen in the capture phase to
    // catch it whichever element actually scrolls.
    document.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [chapterKey]);

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
