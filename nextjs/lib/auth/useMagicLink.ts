'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

type MagicLinkState = 'idle' | 'sending' | 'sent' | 'error';

// API error code → auth.* dictionary key (localized via next-intl).
const ERROR_KEYS: Record<string, string> = {
  'invalid-email':          'errInvalidEmail',
  'send-failed':            'errSendFailed',
  'link-generation-failed': 'errGeneric',
  'email-misconfigured':    'errService',
  'network':                'errNetwork',
};

export function useMagicLink() {
  const t = useTranslations('auth');
  const [state, setState]               = useState<MagicLinkState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const sendLink = useCallback(async (email: string) => {
    setState('sending');
    setErrorMessage('');
    localStorage.setItem('emailForSignIn', email);
    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
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
    } catch {
      localStorage.removeItem('emailForSignIn');
      setErrorMessage(t(ERROR_KEYS['network']));
      setState('error');
    }
  }, [t]);

  const reset = useCallback(() => {
    setState('idle');
    setErrorMessage('');
  }, []);

  return { sendLink, state, errorMessage, reset };
}
