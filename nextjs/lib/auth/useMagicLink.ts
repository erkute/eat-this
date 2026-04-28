'use client';

import { useState, useCallback } from 'react';

export type MagicLinkState = 'idle' | 'sending' | 'sent' | 'error';

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-email':          'Bitte gib eine gültige E-Mail-Adresse ein.',
  'send-failed':            'Wir konnten die E-Mail nicht zustellen. Bitte versuch es nochmal.',
  'link-generation-failed': 'Etwas ist schiefgelaufen. Bitte versuch es nochmal.',
  'email-misconfigured':    'Service-Fehler – bitte später nochmal versuchen.',
  'network':                'Netzwerkfehler – bitte erneut versuchen.',
};

export function useMagicLink() {
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
        body:    JSON.stringify({
          email,
          continueUrl: window.location.origin + '/',
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        localStorage.removeItem('emailForSignIn');
        const code = (data as { error?: string }).error ?? '';
        setErrorMessage(ERROR_MESSAGES[code] ?? 'Etwas ist schiefgelaufen. Versuch es nochmal.');
        setState('error');
        return;
      }

      setState('sent');
    } catch {
      localStorage.removeItem('emailForSignIn');
      setErrorMessage(ERROR_MESSAGES['network']);
      setState('error');
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setErrorMessage('');
  }, []);

  return { sendLink, state, errorMessage, reset };
}
