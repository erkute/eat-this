'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { afterEmailLink } from '@/lib/auth/emailLinkPending';

/** Visible immediately, without waiting for the auth panel's styles or artwork. */
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
    data-auth-surface-loading={layer} style={{
      position: 'fixed', inset: 0, background: 'var(--et-ground)', color: 'var(--et-fg)',
      display: 'grid', placeItems: 'center', padding: 24, visibility: 'visible',
      zIndex: layer === 'email' ? 'var(--et-z-email-link)' : 'var(--et-z-tour)',
    }}>
    <div style={{ width: 'min(440px, 100%)', textAlign: 'center', fontFamily: 'var(--et-font-body)' }}>
      <h2 style={{ margin: 0, fontSize: 'clamp(28px, 5vw, 40px)', lineHeight: 1.15 }}>{label}</h2>
      <p role="status" style={{ margin: '20px 0 0', fontSize: 17 }}>
        {en ? 'Loading …' : 'Wird geladen …'}
      </p>
    </div>
  </div>;
}
