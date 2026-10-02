'use client';

import { useEffect } from 'react';
import { armArticleMotion } from '@/lib/articleMotion';

/** Hängt die Bewegung an den Artikel mit diesem Slug (lib/articleMotion.ts).
 *  Rendert nichts; NewsArticleShell bleibt eine Server-Komponente. */
export default function ArticleMotion({ slug }: { slug: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      `[data-page="news-article"][data-article-slug="${CSS.escape(slug)}"]`
    );
    return root ? armArticleMotion(root) : undefined;
  }, [slug]);
  return null;
}
