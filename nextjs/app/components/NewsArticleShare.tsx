'use client';

import { useShareLink } from '@/lib/useShareLink';
import ShareFallback from './ShareFallback';

interface Props {
  title: string;
  excerpt?: string;
  label: string;
  copiedLabel?: string;
  className?: string;
}

export default function NewsArticleShare({ title, excerpt, label, copiedLabel, className }: Props) {
  const { copied, errorUrl, share } = useShareLink();
  const onShare = () => share({ title, text: excerpt || title, url: window.location.href });

  return (
    <>
    <button type="button" className={className} onClick={onShare}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
      </svg>
      <span>{copied ? copiedLabel || label : label}</span>
    </button>
    {errorUrl && <ShareFallback url={errorUrl} />}
    </>
  );
}
