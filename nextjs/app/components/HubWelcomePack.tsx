'use client'

import Image from 'next/image'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { useMagicLink } from '@/lib/auth/useMagicLink'
import { useAuth } from '@/lib/auth'
import styles from './HubPacks.module.css'

const GIFT_ART = '/pics/booster/booster_free.webp'

/**
 * Welcome Pack gift card with an inline magic-link signup (mockup .pack.gift +
 * .p-signup). Submitting the email sends the magic link directly and swaps the
 * form for a "Check deine Mail" confirmation — no modal detour.
 */
export default function HubWelcomePack() {
  const t = useTranslations('hub.welcomePack')
  const { sendLink, state, errorMessage } = useMagicLink()
  const { user } = useAuth()
  // The Welcome Pack is a signup gift — pointless once you're logged in. Hide
  // it for signed-in users, but only after mount so the first client render
  // still matches the SSR (anon) output and doesn't trip a hydration mismatch.
  // Until auth resolves, the data-signup-gift attribute + the pre-paint
  // data-auth flag (CRITICAL_BOOTSTRAP → globals.css) keep the card from
  // flashing for returning signed-in visitors.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const sending = state === 'sending'
  const sent = state === 'sent'

  if (mounted && user) return null

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (sending || sent) return
    const input = e.currentTarget.elements.namedItem('email') as HTMLInputElement | null
    const email = input?.value?.trim()
    if (!email || !email.includes('@')) return
    void sendLink(email)
  }

  return (
    <article className={`${styles.pack} ${styles.gift}`} data-signup-gift="">
      <div className={styles.packArt}>
        <Image src={GIFT_ART} alt="" fill sizes="200px" className={styles.artImg} />
      </div>
      <p className={styles.packCat}>{t('cat')}</p>
      <h3 className={styles.packName}>{t('name')}</h3>
      <p className={styles.packMeta}>
        {t('desc')}
      </p>
      {sent ? (
        <p className={styles.giftSent} role="status">{t('checkMail')}</p>
      ) : (
        <form className={styles.signup} onSubmit={onSubmit} noValidate>
          <input
            type="email"
            name="email"
            placeholder={t('emailPlaceholder')}
            aria-label={t('emailAria')}
            required
            autoComplete="email"
            disabled={sending}
            className={styles.signupInput}
          />
          <button type="submit" disabled={sending} className={`${styles.signupBtn} homeCta homeCtaPrimary homeCtaFull`}>
            {sending ? t('sending') : t('signUp')}
          </button>
        </form>
      )}
      {state === 'error' && (
        <p className={styles.giftError} role="alert">{errorMessage}</p>
      )}
    </article>
  )
}
