'use client';
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { usePackOwnership } from '@/app/components/PackOwnership';
import { useAuth } from '@/lib/auth';
import { trackEvent } from '@/lib/analytics';
import styles from './PackDetail.module.css';

interface Props {
  packId: string;
  packName: string;
  amountCents: number;
  locale: 'de' | 'en';
  label: string;
  pendingLabel: string;
  ownedLabel: string;
  ownedHref: string;
  errorLabel: string;
  className?: string;
  errorClassName?: string;
}

// Kicks off Stripe Hosted Checkout for a single pack. Signed-in users send
// their ID token (already-owned check + customer_email prefill); guests go
// through Stripe's email-collection flow. The route returns { url } and we
// hand the browser off to it.
export default function PackBuyButton({
  packId,
  packName,
  amountCents,
  locale,
  label,
  pendingLabel,
  ownedLabel,
  ownedHref,
  errorLabel,
  className,
  errorClassName,
}: Props) {
  const { user } = useAuth();
  const owned = usePackOwnership();
  const alreadyOwned = owned?.has(packId) || owned?.has('all-berlin');
  const [conflictUid, setConflictUid] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'pending' | 'owned' | 'error'>('idle');

  useEffect(() => {
    trackEvent('view_item', {
      item_id: packId,
      item_name: packName,
      currency: 'EUR',
      value: amountCents / 100,
    });
  }, [packId, packName, amountCents]);

  const onBuy = useCallback(async () => {
    if (state === 'pending') return;
    trackEvent('begin_checkout', {
      item_id: packId,
      item_name: packName,
      currency: 'EUR',
      value: amountCents / 100,
      checkout_mode: user ? 'authenticated' : 'guest',
    });
    setState('pending');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ packId, locale }),
      });

      if (res.status === 409) {
        trackEvent('checkout_already_owned', { item_id: packId });
        setConflictUid(user?.uid ?? null);
        setState('owned');
        return;
      }
      if (!res.ok) {
        trackEvent('checkout_error', { item_id: packId, status: res.status });
        setState('error');
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setState('error');
    } catch {
      trackEvent('checkout_error', { item_id: packId, status: 'network' });
      setState('error');
    }
  }, [user, packId, packName, amountCents, locale, state]);

  if (alreadyOwned || (state === 'owned' && conflictUid === (user?.uid ?? null))) {
    return (
      <Link className={className ?? styles.cta} href={ownedHref}>
        {ownedLabel}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className ?? styles.cta}
        onClick={onBuy}
        disabled={state === 'pending' || owned === null}
        aria-busy={state === 'pending' || owned === null}
        aria-label={owned === null ? (locale === 'de' ? 'Wird geladen' : 'Loading') : undefined}
      >
        {state === 'pending' ? pendingLabel : owned === null ? '…' : label}
      </button>
      {state === 'error' && <p className={errorClassName ?? styles.ctaError}>{errorLabel}</p>}
    </>
  );
}
