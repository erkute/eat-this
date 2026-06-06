'use client';

interface Props {
  title: string;
  excerpt?: string;
  label: string;
  className?: string;
}

// Single "Teilen" button (mockup-chewy screen 8 .art-share) — native share with
// a clipboard fallback. Replaces the legacy 3-icon X/WhatsApp/native row.
export default function NewsArticleShare({ title, excerpt, label, className }: Props) {
  const share = async () => {
    const data = { title, text: excerpt || title, url: window.location.href };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* user cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(window.location.href); } catch { /* no-op */ }
    }
  };

  return (
    <button type="button" className={className} onClick={share}>
      {label}
    </button>
  );
}
