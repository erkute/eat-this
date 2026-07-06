import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { getStripe } from '@/lib/stripe'
import { getPack } from '@/lib/stripe-catalog'
import { maskEmail } from '@/lib/maskEmail'
import CheckoutSuccessAnalytics from './CheckoutSuccessAnalytics'
import styles from './success.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

interface SearchParams { session_id?: string; pack?: string }

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params:       Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}) {
  const { locale: rawLocale } = await params
  const locale = rawLocale === 'en' ? 'en' : 'de'
  setRequestLocale(rawLocale)

  const { session_id, pack: packId } = await searchParams

  // Server-side fetch the Stripe session so we can show the buyer their
  // own email and the pack they bought. Failure mode: just show the
  // generic copy without the email/pack name.
  //
  // The session is addressed purely by the URL param, so this page must not
  // echo the raw address (unauthenticated PII from an attacker-controlled
  // parameter). Only paid sessions show it, and only masked — enough for the
  // buyer to recognise their own inbox, useless to anyone else with the link.
  let email: string | null = null
  let packLabel: string | null = null
  let amountCents: number | null = null
  if (session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id)
      if (session.payment_status === 'paid' && session.customer_details?.email) {
        email = maskEmail(session.customer_details.email)
      }
    } catch {
      /* ignore — generic copy is fine */
    }
  }
  if (packId) {
    const pack = getPack(packId)
    if (pack) {
      packLabel = pack.displayName
      amountCents = pack.amountCents
    }
  }

  const t = locale === 'de'
    ? {
        eyebrow: 'Zahlung bestätigt',
        headline: 'Pack gesichert.',
        body: email
          ? `Wir haben dir gerade einen Login-Link an ${email} geschickt. Klick rein — dein Pack wartet schon auf deiner Map.`
          : 'Wir haben dir gerade einen Login-Link geschickt. Klick rein — dein Pack wartet schon auf deiner Map.',
        packTag: packLabel ? `${packLabel} Pack freigeschaltet` : null,
        check: 'Check dein Postfach (auch Spam).',
        backLabel: 'Zurück zur Map',
      }
    : {
        eyebrow: 'Payment confirmed',
        headline: 'Pack secured.',
        body: email
          ? `We just sent a sign-in link to ${email}. Click it — your pack is already waiting on your map.`
          : 'We just sent you a sign-in link. Click it — your pack is already waiting on your map.',
        packTag: packLabel ? `${packLabel} pack unlocked` : null,
        check: 'Check your inbox (and spam).',
        backLabel: 'Back to the map',
      }

  return (
    <main className={styles.page}>
      {session_id && packId && packLabel && amountCents !== null && (
        <CheckoutSuccessAnalytics
          transactionId={session_id}
          packId={packId}
          packName={packLabel}
          amountCents={amountCents}
        />
      )}
      <div className={styles.card}>
        <span className={styles.eyebrow}>{t.eyebrow}</span>
        <h1 className={styles.h1}>{t.headline}</h1>
        {t.packTag && <span className={styles.packTag}>{t.packTag}</span>}
        <p className={styles.body}>{t.body}</p>
        <p className={styles.check}>{t.check}</p>
        <Link href={locale === 'en' ? '/en/map' : '/map'} className={styles.cta}>
          {t.backLabel}
        </Link>
      </div>
    </main>
  )
}
