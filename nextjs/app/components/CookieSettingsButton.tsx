'use client';

import { useTranslation } from '@/lib/i18n';

/** Reopens the consent gate — CookieConsent listens for this event. Its own
 *  client component so server-rendered surfaces (the legal shell) can offer
 *  the same control the footer does, without going client themselves. */
export default function CookieSettingsButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event('eatthis:open-cookie-settings'))}
    >
      {t('footer.cookieSettings')}
    </button>
  );
}
