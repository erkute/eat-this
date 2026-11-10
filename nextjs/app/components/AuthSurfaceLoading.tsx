'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { afterEmailLink } from '@/lib/auth/emailLinkPending';

/** Keeps the page covered while the active auth surface prepares. */
export default function AuthSurfaceLoading({ layer }: { layer: 'email' | 'tour' }) {
  const en = useLocale() === 'en';
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [focusReady, setFocusReady] = useState(layer === 'email');
  // The email confirmation owns focus while the lower tour layer prepares.
  useEffect(() => {
    if (layer === 'tour') return afterEmailLink(() => setFocusReady(true));
  }, [layer]);
  useDialogFocus(focusReady, panel, trigger);
  const label = layer === 'email'
    ? (en ? 'Sign in to Eat This' : 'Anmeldung bei Eat This')
    : (en ? 'Your introduction to Eat This' : 'Dein Einstieg in Eat This');
  return <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-busy="true" aria-label={label}
    aria-hidden={!focusReady}
    data-auth-surface-loading={layer} style={{
      position: 'fixed', inset: 0, backgroundColor: 'var(--et-ground)', visibility: 'visible',
      zIndex: layer === 'email' ? 'var(--et-z-email-link)' : 'var(--et-z-tour)',
    }} />;
}
