'use client';

import { useRef } from 'react';
import { useLocale } from 'next-intl';
import { useDialogFocus } from '@/lib/useDialogFocus';

/** Cover the page and contain focus until the requested auth surface is ready. */
export default function AuthSurfaceLoading({ layer }: { layer: 'email' | 'tour' }) {
  const en = useLocale() === 'en';
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  useDialogFocus(true, panel, trigger);
  const label = layer === 'email'
    ? (en ? 'Sign in to Eat This' : 'Anmeldung bei Eat This')
    : (en ? 'Your introduction to Eat This' : 'Dein Einstieg in Eat This');
  return <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-busy="true" aria-label={label}
    data-auth-surface-loading={layer} style={{
      position: 'fixed', inset: 0, background: 'var(--et-ground)',
      zIndex: layer === 'email' ? 'var(--et-z-email-link)' : 'var(--et-z-tour)',
    }} />;
}
