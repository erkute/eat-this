'use client';

import { useEffect } from 'react';

/** Länger als der längste Takt des Kopf-Auftritts (CSS: 620 + 900 ms). */
const INTRO_MS = 1700;
const INTRO_MARK = 'data-article-intro';

/** Hängt die Bewegung an den Artikel mit diesem Slug (lib/articleMotion.ts).
 *  Rendert nichts; NewsArticleShell bleibt eine Server-Komponente. */
export default function ArticleMotion({ slug }: { slug: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      `[data-page="news-article"][data-article-slug="${CSS.escape(slug)}"]`
    );
    const finishIntro = () => document.documentElement.removeAttribute(INTRO_MARK);
    const timer = window.setTimeout(finishIntro, INTRO_MS);
    let active = true;
    let disarm: (() => void) | undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const scenes = root?.querySelectorAll('[data-motion]');
    const observer = !reduce.matches && scenes?.length && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          observer?.disconnect();
          void import('@/lib/articleMotion').then(({ armArticleMotion }) => {
            if (active && root) disarm = armArticleMotion(root);
          }).catch(() => { /* Article content remains visible without motion. */ });
        }, { rootMargin: '400px' })
      : null;
    scenes?.forEach(scene => observer?.observe(scene));
    return () => {
      active = false;
      window.clearTimeout(timer);
      finishIntro();
      observer?.disconnect();
      disarm?.();
    };
  }, [slug]);
  return null;
}
