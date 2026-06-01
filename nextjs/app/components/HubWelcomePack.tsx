'use client'

import Image from 'next/image'
import { type FormEvent } from 'react'
import { useMagicLink } from '@/lib/auth/useMagicLink'
import styles from './HubPacks.module.css'

const GIFT_ART = '/pics/booster/booster_free.webp'

/**
 * Welcome Pack gift card with an inline magic-link signup (mockup .pack.gift +
 * .p-signup). Submitting the email sends the magic link directly and swaps the
 * form for a "Check deine Mail" confirmation — no modal detour.
 */
export default function HubWelcomePack() {
  const { sendLink, state, errorMessage } = useMagicLink()
  const sending = state === 'sending'
  const sent = state === 'sent'

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (sending || sent) return
    const input = e.currentTarget.elements.namedItem('email') as HTMLInputElement | null
    const email = input?.value?.trim()
    if (!email || !email.includes('@')) return
    void sendLink(email)
  }

  return (
    <article className={`${styles.pack} ${styles.gift}`}>
      <div className={styles.packArt}>
        <Image src={GIFT_ART} alt="" fill sizes="200px" className={styles.artImg} />
      </div>
      <p className={styles.packCat}>Booster Pack</p>
      <h3 className={styles.packName}>Welcome Pack</h3>
      <p className={styles.packMeta}>
        Weitere kuratierte Spots samt Must Eats — direkt nach deiner Anmeldung.
      </p>
      {sent ? (
        <p className={styles.giftSent} role="status">Check deine Mail ✓</p>
      ) : (
        <form className={styles.signup} onSubmit={onSubmit} noValidate>
          <input
            type="email"
            name="email"
            placeholder="deine@email.com"
            aria-label="E-Mail Adresse"
            required
            autoComplete="email"
            disabled={sending}
            className={styles.signupInput}
          />
          <button type="submit" disabled={sending} className={styles.signupBtn}>
            {sending ? 'Sende…' : 'Anmelden →'}
          </button>
        </form>
      )}
      {state === 'error' && (
        <p className={styles.giftError} role="alert">{errorMessage}</p>
      )}
    </article>
  )
}
