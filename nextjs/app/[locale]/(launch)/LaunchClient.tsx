'use client'

import { useState, type FormEvent } from 'react'
import styles from './launch.module.css'

interface Props {
  locale: 'de' | 'en'
}

const STRINGS = {
  de: {
    placeholder: 'deine@email.com',
    notify: 'Notify Me →',
    thanks: 'Danke ✓',
    error: 'Hat nicht geklappt — bitte nochmal.',
    emailLabel: 'E-Mail',
  },
  en: {
    placeholder: 'your@email.com',
    notify: 'Notify Me →',
    thanks: 'Thanks ✓',
    error: 'Something went wrong — please try again.',
    emailLabel: 'Email',
  },
} as const

export default function LaunchClient({ locale }: Props) {
  const t = STRINGS[locale]
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hasError, setHasError] = useState(false)

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
      setTimeout(() => setSubmitted(false), 4000)
    } catch {
      setHasError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <input
          type="email"
          name="email"
          placeholder={t.placeholder}
          aria-label={t.emailLabel}
          required
          autoComplete="email"
          disabled={submitting || submitted}
        />
        <button type="submit" disabled={submitting || submitted}>
          {submitted ? t.thanks : t.notify}
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
