'use client';
import { useShareLink } from '@/lib/useShareLink';
import ShareFallback from './ShareFallback';
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
  /** Share this URL instead of the current page — the profile's invite link
   *  is not the address the user is standing on. */
  url?: string;
}

export default function ShareButton({
  title,
  slug,
  contentType,
  className,
  label,
  copiedLabel,
  url: shareUrl,
}: Props) {
  const { copied, errorUrl, share } = useShareLink();

  return (
    <>
    <button
      type="button"
      className={className}
      onClick={async () => {
        const url = shareUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
        const shareData = { title, text: title, url };
        const method = await share(shareData);
        if (method) trackEvent('share', { content_type: contentType, item_id: slug, method });
      }}
    >
      {copied ? copiedLabel : label}
    </button>
    {errorUrl && <ShareFallback url={errorUrl} />}
    </>
  );
}
