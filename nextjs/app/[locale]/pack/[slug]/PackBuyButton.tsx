'use client'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { trackEvent } from '@/lib/analytics'
import styles from './PackDetail.module.css'

interface Props {
  packId: string
  packName: string
  amountCents: number
  locale: 'de' | 'en'
  label: string
  pendingLabel: string
  ownedLabel: string
  ownedHref: string
  errorLabel: string
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
}: Props) {
  const { user } = useAuth()
  const [state, setState] = useState<'idle' | 'pending' | 'owned' | 'error'>('idle')

  useEffect(() => {
    trackEvent('view_item', {
      item_id: packId,
      item_name: packName,
      currency: 'EUR',
      value: amountCents / 100,
    })
  }, [packId, packName, amountCents])

  const onBuy = useCallback(async () => {
    if (state === 'pending') return
    trackEvent('begin_checkout', {
      item_id: packId,
      item_name: packName,
      currency: 'EUR',
      value: amountCents / 100,
      checkout_mode: user ? 'authenticated' : 'guest',
    })
    setState('pending')
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ packId, locale }),
      })

      if (res.status === 409) {
        trackEvent('checkout_already_owned', { item_id: packId })
        setState('owned')
        return
      }
      if (!res.ok) {
        trackEvent('checkout_error', { item_id: packId, status: res.status })
        setState('error')
        return
      }
      const data = (await res.json()) as { url?: string }
      if (data.url) {
        window.location.href = data.url
        return
      }
      setState('error')
    } catch {
      trackEvent('checkout_error', { item_id: packId, status: 'network' })
      setState('error')
    }
  }, [user, packId, packName, amountCents, locale, state])

  if (state === 'owned') {
    return (
      <a className={styles.cta} href={ownedHref}>
        {ownedLabel}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </a>
    )
  }

  return (
    <>
      <button type="button" className={styles.cta} onClick={onBuy} disabled={state === 'pending'}>
        {state === 'pending' ? pendingLabel : label}
        {state !== 'pending' && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        )}
      </button>
      {state === 'error' && <p className={styles.ctaError}>{errorLabel}</p>}
    </>
  )
}
