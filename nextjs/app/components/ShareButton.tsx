'use client';
import { useState } from 'react';
import { trackEvent } from '@/lib/analytics';

interface Props {
  /** Shared title/text of the native sheet. */
  title: string;
  /** Analytics item id — the restaurant slug. */
  slug: string;
  contentType: string;
  className?: string;
  label: string;
  copiedLabel: string;
}

/**
 * Share the current URL: native sheet on touch, clipboard everywhere else.
 *
 * Extracted from the map detail sheet so the public /restaurant/[slug] page —
 * where visitors from Google actually land — can share too instead of having
 * no share affordance at all. One implementation, because the fallback below
 * carries two workarounds that are not worth owning twice.
 */
export default function ShareButton({
  title,
  slug,
  contentType,
  className,
  label,
  copiedLabel,
}: Props) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const shareData = { title, text: title, url };
        // Native share sheet only on touch devices (mobile). Desktop Chrome
        // exposes navigator.share but it's a poor fit there — so desktop
        // always copies the link and shows a confirmation.
        const isTouch =
          typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
        if (isTouch && typeof navigator !== 'undefined' && 'share' in navigator) {
          try {
            await navigator.share(shareData);
            trackEvent('share', { content_type: contentType, item_id: slug, method: 'native' });
            return;
          } catch {
            return;
          }
        }
        try {
          if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(url);
          else {
            // readonly = no iOS keyboard; restore scroll after select() — the
            // map page is 100lvh tall (URL-bar apron) and iOS scrolls it to
            // "reveal" the focused textarea, which left every floating control
            // sitting a bar-height too high.
            const sx = window.scrollX,
              sy = window.scrollY;
            const ta = document.createElement('textarea');
            ta.value = url;
            ta.readOnly = true;
            ta.style.position = 'fixed';
            ta.style.top = '0';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            window.scrollTo(sx, sy);
          }
        } catch {}
        trackEvent('share', { content_type: contentType, item_id: slug, method: 'copy_link' });
        setDone(true);
        window.setTimeout(() => setDone(false), 1800);
      }}
    >
      <span>{done ? copiedLabel : label}</span>
    </button>
  );
}
