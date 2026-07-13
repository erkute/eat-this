import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { maskEmail } from '@/lib/maskEmail'
import { retrieveVerifiedCheckoutSession, type CheckoutMode } from '@/lib/stripe-session'
import CheckoutSuccessAnalytics from './CheckoutSuccessAnalytics'
import styles from './success.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

interface SearchParams { session_id?: string }

type CheckoutState =
  | {
      kind: 'paid'
      transactionId: string
      packId: string
      packLabel: string
      amountCents: number
      mode: CheckoutMode
      email: string | null
    }
  | { kind: 'pending'; packLabel: string }
  | { kind: 'invalid' }

interface CheckoutCopy {
  eyebrow: string
  headline: string
  body: string
  packTag: string | null
  check: string
  backLabel: string
  backHref: '/map' | '/packs'
}

function getCheckoutCopy(locale: 'de' | 'en', checkout: CheckoutState): CheckoutCopy {
  if (locale === 'de') {
    if (checkout.kind === 'paid') {
      return {
        eyebrow: 'Zahlung bestätigt',
        headline: 'Pack gesichert.',
        body: checkout.mode === 'guest'
          ? checkout.email
            ? `Deine Zahlung ist bestätigt. Den Login-Link für dein Pack schicken wir an ${checkout.email}.`
            : 'Deine Zahlung ist bestätigt. Den Login-Link für dein Pack schicken wir dir per E-Mail.'
          : 'Deine Zahlung ist bestätigt. Dein Pack wird jetzt auf deiner Map freigeschaltet.',
        packTag: `${checkout.packLabel} Pack`,
        check: checkout.mode === 'guest'
          ? 'Check gleich dein Postfach (auch Spam).'
          : 'Die Freischaltung kann einen Moment dauern.',
        backLabel: 'Zurück zur Map',
        backHref: '/map',
      }
    }
    if (checkout.kind === 'pending') {
      return {
        eyebrow: 'Zahlung in Bearbeitung',
        headline: 'Fast geschafft.',
        body: 'Stripe verarbeitet deine Zahlung noch. Dein Pack wird erst nach der Zahlungsbestätigung freigeschaltet.',
        packTag: `${checkout.packLabel} Pack`,
        check: 'Du kannst diese Seite später erneut laden.',
        backLabel: 'Zurück zur Map',
        backHref: '/map',
      }
    }
    return {
      eyebrow: 'Nicht bestätigt',
      headline: 'Kauf nicht gefunden.',
      body: 'Wir konnten den Zahlungsstatus für diesen Link gerade nicht bestätigen. Prüfe deine Stripe-Bestätigung oder versuche es später erneut.',
      packTag: null,
      check: 'Versuche es erneut oder öffne deine Pack-Übersicht.',
      backLabel: 'Zu den Packs',
      backHref: '/packs',
    }
  }

  if (checkout.kind === 'paid') {
    return {
      eyebrow: 'Payment confirmed',
      headline: 'Pack secured.',
      body: checkout.mode === 'guest'
        ? checkout.email
          ? `Your payment is confirmed. We will send the sign-in link for your pack to ${checkout.email}.`
          : 'Your payment is confirmed. We will send the sign-in link for your pack by email.'
        : 'Your payment is confirmed. Your pack is now being unlocked on your map.',
      packTag: `${checkout.packLabel} pack`,
      check: checkout.mode === 'guest'
        ? 'Check your inbox (and spam) shortly.'
        : 'Unlocking can take a moment.',
      backLabel: 'Back to the map',
      backHref: '/map',
    }
  }
  if (checkout.kind === 'pending') {
    return {
      eyebrow: 'Payment processing',
      headline: 'Almost there.',
      body: 'Stripe is still processing your payment. Your pack will be unlocked only after payment is confirmed.',
      packTag: `${checkout.packLabel} pack`,
      check: 'You can reload this page later.',
      backLabel: 'Back to the map',
      backHref: '/map',
    }
  }
  return {
    eyebrow: 'Not confirmed',
    headline: 'Purchase not found.',
    body: 'We could not confirm the payment status for this link. Check your Stripe confirmation or try again later.',
    packTag: null,
    check: 'Try again or open the packs overview.',
    backLabel: 'View packs',
    backHref: '/packs',
  }
}

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

  const { session_id } = await searchParams

  // Nothing displayed or tracked comes from query parameters except the
  // opaque session identifier. Pack, amount and mode are accepted only after
  // the server has bound the Stripe session to the catalog and exact Price.
  let checkout: CheckoutState = { kind: 'invalid' }
  if (session_id) {
    try {
      const { session, pack, mode } = await retrieveVerifiedCheckoutSession(session_id)
      if (session.payment_status === 'paid') {
        checkout = {
          kind: 'paid',
          transactionId: session.id,
          packId: pack.packId,
          packLabel: pack.displayName,
          amountCents: session.amount_total!,
          mode,
          email: mode === 'guest' && session.customer_details?.email
            ? maskEmail(session.customer_details.email)
            : null,
        }
      } else {
        checkout = { kind: 'pending', packLabel: pack.displayName }
      }
    } catch {
      checkout = { kind: 'invalid' }
    }
  }

  const t = getCheckoutCopy(locale, checkout)

  return (
    <main className={styles.page}>
      {checkout.kind === 'paid' && (
        <CheckoutSuccessAnalytics
          transactionId={checkout.transactionId}
          packId={checkout.packId}
          packName={checkout.packLabel}
          amountCents={checkout.amountCents}
        />
      )}
      <div className={styles.card}>
        <span className={styles.eyebrow}>{t.eyebrow}</span>
        <h1 className={styles.h1}>{t.headline}</h1>
        {t.packTag && <span className={styles.packTag}>{t.packTag}</span>}
        <p className={styles.body}>{t.body}</p>
        <p className={styles.check}>{t.check}</p>
        <Link href={t.backHref} className={styles.cta}>
          {t.backLabel}
        </Link>
      </div>
    </main>
  )
}
