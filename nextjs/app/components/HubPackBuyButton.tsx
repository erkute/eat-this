'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { trackEvent } from '@/lib/analytics'

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
  className: string
  errorClassName?: string
  ariaLabel?: string
}

export default function HubPackBuyButton({
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
  ariaLabel,
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

  const buy = useCallback(async () => {
    if (state === 'pending') return
    setState('pending')
    try {
      trackEvent('begin_checkout', {
        item_id: packId,
        item_name: packName,
        currency: 'EUR',
        value: amountCents / 100,
        checkout_mode: user ? 'authenticated' : 'guest',
      })
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
    return <a href={ownedHref} className={className}>{ownedLabel}</a>
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={buy}
        disabled={state === 'pending'}
        aria-busy={state === 'pending'}
        aria-label={ariaLabel}
      >
        {state === 'pending' ? pendingLabel : label}
      </button>
      {state === 'error' && <p className={errorClassName}>{errorLabel}</p>}
    </>
  )
}
