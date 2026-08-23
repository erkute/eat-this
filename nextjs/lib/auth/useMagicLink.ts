'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { trackEvent } from '@/lib/analytics';

type MagicLinkState = 'idle' | 'sending' | 'sent' | 'error';

// API error code → auth.* dictionary key (localized via next-intl).
const ERROR_KEYS: Record<string, string> = {
  'invalid-email': 'errInvalidEmail',
  'send-failed': 'errSendFailed',
  'link-generation-failed': 'errGeneric',
  'email-misconfigured': 'errService',
  network: 'errNetwork',
};

export function useMagicLink() {
  const t = useTranslations('auth');
  const [state, setState] = useState<MagicLinkState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * `continueUrl` is where the mail's link lands the user after sign-in.
   * Omit it and /welcome sends them home, which is right for a signup that
   * started on the home page and wrong for one that started somewhere the
   * user was in the middle of something — a locked spot on the map, say.
   * The server re-validates it against an own-origin allow-list, so an
   * arbitrary value here cannot bounce anyone off-site.
   */
  const sendLink = useCallback(
    async (email: string, continueUrl?: string) => {
      trackEvent('login_start', { method: 'email_link' });
      setState('sending');
      setErrorMessage('');
      localStorage.setItem('emailForSignIn', email);
      try {
        const response = await fetch('/api/auth/send-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(continueUrl ? { email, continueUrl } : { email }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          localStorage.removeItem('emailForSignIn');
          const code = (data as { error?: string }).error ?? '';
          setErrorMessage(t(ERROR_KEYS[code] ?? 'errGeneric'));
          setState('error');
          return;
        }

        setState('sent');
        trackEvent('login_link_sent', { method: 'email_link' });
      } catch {
        localStorage.removeItem('emailForSignIn');
        setErrorMessage(t(ERROR_KEYS['network']));
        setState('error');
      }
    },
    [t]
  );

  const reset = useCallback(() => {
    setState('idle');
    setErrorMessage('');
  }, []);

  return { sendLink, state, errorMessage, reset };
}
