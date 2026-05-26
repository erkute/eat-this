'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import styles from './launch.module.css'

interface Props {
  locale: 'de' | 'en'
}

const STRINGS = {
  de: {
    placeholder: '',
    notify: 'Notify Me →',
    thanks: 'Danke ✓',
    error: 'Hat nicht geklappt — bitte nochmal.',
    emailLabel: 'E-Mail',
  },
  en: {
    placeholder: '',
    notify: 'Notify Me →',
    thanks: 'Thanks ✓',
    error: 'Something went wrong — please try again.',
    emailLabel: 'Email',
  },
} as const

export default function LaunchClient({ locale }: Props) {
  const t = STRINGS[locale]
  const [expanded, setExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hasError, setHasError] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (expanded) inputRef.current?.focus()
  }, [expanded])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting || submitted) return
    const form = e.currentTarget
    const input = form.elements.namedItem('email') as HTMLInputElement | null
    const email = input?.value?.trim()
    if (!email || !email.includes('@')) return

    setSubmitting(true)
    setHasError(false)
    try {
      const res = await fetch('/api/launch-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
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
    )
  }

  if (submitted) {
    return (
      <div className={styles.thanksBox} role="status">
        <span className={styles.thanks}>{t.thanks}</span>
      </div>
    )
  }

  return (
    <>
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
