'use client';

import { useState, useCallback } from 'react';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

export type MagicLinkState = 'idle' | 'sending' | 'sent' | 'error';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email':          'Bitte gib eine gültige E-Mail-Adresse ein.',
  'auth/too-many-requests':      'Zu viele Versuche – bitte warte einen Moment.',
  'auth/network-request-failed': 'Netzwerkfehler – bitte erneut versuchen.',
};

export function useMagicLink() {
  const [state, setState]               = useState<MagicLinkState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const sendLink = useCallback(async (email: string) => {
    setState('sending');
    setErrorMessage('');
    localStorage.setItem('emailForSignIn', email);
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: window.location.origin + '/',
        handleCodeInApp: true,
      });
      setState('sent');
    } catch (err: unknown) {
      localStorage.removeItem('emailForSignIn');
      const code = (err as { code?: string }).code ?? '';
      setErrorMessage(ERROR_MESSAGES[code] ?? 'Etwas ist schiefgelaufen. Versuch es nochmal.');
      setState('error');
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setErrorMessage('');
  }, []);

  return { sendLink, state, errorMessage, reset };
}
