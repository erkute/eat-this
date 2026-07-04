'use client';

import { useState } from 'react';

interface Props {
  title: string;
  excerpt?: string;
  label: string;
  copiedLabel?: string;
  className?: string;
}

export default function NewsArticleShare({ title, excerpt, label, copiedLabel, className }: Props) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const data = { title, text: excerpt || title, url: window.location.href };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch { /* no-op */ }
    }
  };

  return (
    <button type="button" className={className} onClick={share}>
      <span>{copied ? copiedLabel || label : label}</span>
    </button>
  );
}
