'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Script from 'next/script'
import styles from './launch.module.css'

interface Props {
  locale: 'de' | 'en'
}

const STRINGS = {
  de: {
    placeholder: '',
    notify: 'Notify Me →',
    // Generic enough to cover both DOI-on ("check your inbox") and the
    // legacy direct-add path — DOI sends the confirmation mail behind
    // the scenes, the user only sees this card either way.
    thanksTitle: 'Check deine Mailbox.',
    thanksSub: 'Wenn ein Bestätigungs-Link kommt: einmal klicken und du bist drin.',
    error: 'Hat nicht geklappt — bitte nochmal.',
    emailLabel: 'E-Mail',
  },
  en: {
    placeholder: '',
    notify: 'Notify Me →',
    thanksTitle: 'Check your inbox.',
    thanksSub: 'If a confirmation link arrives, click it once and you are on the list.',
    error: 'Something went wrong — please try again.',
    emailLabel: 'Email',
  },
} as const

/* Augment window for reCAPTCHA Enterprise — the script attaches the
 * `grecaptcha.enterprise` namespace which we call from onSubmit. */
declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (cb: () => void) => void
        execute: (siteKey: string, options: { action: string }) => Promise<string>
      }
    }
  }
}

export default function LaunchClient({ locale }: Props) {
  const t = STRINGS[locale]
  const [expanded, setExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hasError, setHasError] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const mountTs = useRef<number>(Date.now())

  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  useEffect(() => {
    if (expanded) inputRef.current?.focus()
  }, [expanded])

  async function fetchRecaptchaToken(): Promise<string> {
    if (!recaptchaKey || typeof window === 'undefined' || !window.grecaptcha?.enterprise) {
      return ''
    }
    return new Promise<string>(resolve => {
      window.grecaptcha!.enterprise!.ready(async () => {
        try {
          const token = await window.grecaptcha!.enterprise!.execute(recaptchaKey, {
            action: 'launch_signup',
          })
          resolve(token)
        } catch {
          resolve('')
        }
      })
    })
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting || submitted) return
    const form = e.currentTarget
    const input = form.elements.namedItem('email') as HTMLInputElement | null
    const honeypotEl = form.elements.namedItem('company') as HTMLInputElement | null
    const email = input?.value?.trim()
    if (!email || !email.includes('@')) return

    setSubmitting(true)
    setHasError(false)
    try {
      const rt = await fetchRecaptchaToken()
      const res = await fetch('/api/launch-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          locale,
          hp: honeypotEl?.value ?? '',
          mt: Date.now() - mountTs.current,
          rt,
        }),
      })
      if (!res.ok) throw new Error('signup_failed')
      setSubmitted(true)
      if (input) input.value = ''
    } catch {
      setHasError(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (!expanded && !submitted) {
    return (
      <>
        {recaptchaKey && (
          <Script
            src={`https://www.google.com/recaptcha/enterprise.js?render=${recaptchaKey}`}
            strategy="lazyOnload"
          />
        )}
        <button
          type="button"
          className={styles.notifyTrigger}
          onClick={() => setExpanded(true)}
          aria-label={t.notify}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/launch-notify.webp"
            alt=""
            aria-hidden="true"
            width="1478"
            height="369"
          />
        </button>
      </>
    )
  }

  if (submitted) {
    return (
      <div className={styles.thanksBox} role="status">
        <span className={styles.thanksTitle}>{t.thanksTitle}</span>
        <span className={styles.thanksSub}>{t.thanksSub}</span>
      </div>
    )
  }

  return (
    <>
      {recaptchaKey && (
        <Script
          src={`https://www.google.com/recaptcha/enterprise.js?render=${recaptchaKey}`}
          strategy="lazyOnload"
        />
      )}
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <input
          ref={inputRef}
          type="email"
          name="email"
          placeholder={t.placeholder}
          aria-label={t.emailLabel}
          required
          autoComplete="email"
          disabled={submitting}
        />
        {/* Honeypot — invisible to humans (CSS) + autocomplete=off so the
            browser doesn't auto-fill it. Bots that fill every field
            trip the server-side check. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className={styles.honeypot}
        />
        <button type="submit" disabled={submitting} aria-label={t.notify}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/launch-notify.webp"
            alt=""
            aria-hidden="true"
            width="1478"
            height="369"
          />
        </button>
      </form>

      {hasError && (
        <div className={styles.errorNote} role="alert">
          {t.error}
        </div>
      )}
    </>
  )
}
