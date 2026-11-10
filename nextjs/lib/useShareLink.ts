'use client';
import { useEffect, useRef, useState } from 'react';

/** Resolve only after a native share or clipboard write succeeds. */
export function useShareLink() {
  const [copied, setCopied] = useState(false);
  const [errorUrl, setErrorUrl] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const share = async (data: ShareData): Promise<'native' | 'copy_link' | null> => {
    if (timer.current) clearTimeout(timer.current);
    setCopied(false);
    setErrorUrl(null);
    if (window.matchMedia?.('(pointer: coarse)').matches && navigator.share) {
      try { await navigator.share(data); return 'native'; }
      catch (error) {
        if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') return null;
      }
    }
    const url = data.url ?? window.location.href;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else {
        const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const { scrollX, scrollY } = window;
        const input = document.createElement('textarea');
        input.value = url;
        input.readOnly = true;
        input.style.cssText = 'position:fixed;top:0;opacity:0';
        document.body.appendChild(input);
        try {
          input.select();
          if (!document.execCommand('copy')) throw new Error('Copy unavailable');
        } finally {
          input.remove();
          focus?.focus({ preventScroll: true });
          window.scrollTo(scrollX, scrollY);
        }
      }
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 1800);
      return 'copy_link';
    } catch {
      setErrorUrl(url);
      return null;
    }
  };
  return { copied, errorUrl, share };
}
