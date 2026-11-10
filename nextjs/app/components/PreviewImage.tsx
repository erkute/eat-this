'use client';

import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { appScroller } from '@/lib/dom/appScroller';

function previewSource(src: ImgHTMLAttributes<HTMLImageElement>['src']) {
  if (typeof src !== 'string' || !src.startsWith('https://cdn.sanity.io/images/')) return src;
  const params = new URL(src).searchParams;
  const width = Number(params.get('w'));
  const height = Number(params.get('h'));
  if (!Number.isFinite(width) || width <= 160) return src;
  // Preserve crop rectangles and focal points, including their query encoding.
  const smaller = src.replace(/([?&])w=[^&]*/, '$1w=160');
  return height ? smaller.replace(/([?&])h=[^&]*/, `$1h=${Math.round(height * 160 / width)}`) : smaller;
}

/** A real SSR photo remains visible while the full resolution waits for its viewport. */
export default function PreviewImage({ src, srcSet, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const image = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);
  const preview = previewSource(src);
  const full = ready || preview === src;

  useEffect(() => {
    if (full) return;
    if (typeof IntersectionObserver === 'undefined') {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      setReady(true);
      observer.disconnect();
    }, { root: appScroller(), rootMargin: '300px 0px' });
    if (image.current) observer.observe(image.current);
    return () => observer.disconnect();
  }, [full]);

  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Native Sanity sources; alt is forwarded unchanged.
  return <img {...props} ref={image} src={full ? src : preview} srcSet={full ? srcSet : undefined} data-progressive-image="" data-preview-image={full ? undefined : ''} fetchPriority={full ? 'auto' : 'low'} />;
}
