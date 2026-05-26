'use client'

import { useState, type FormEvent } from 'react'
import { useLocale } from 'next-intl'
import styles from './SeoSignupCTA.module.css'

interface Props {
  kicker?: string
  title?: string
}

export default function SeoSignupCTA({ kicker, title }: Props) {
  const locale = useLocale() as 'de' | 'en'
  const de = locale === 'de'
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hasError, setHasError] = useState(false)

  const finalKicker = kicker ?? (de ? 'Eat This bald live' : 'Eat This goes live soon')
  const finalTitle = title ?? (de ? 'Sei dabei, wenn die Map aufgeht.' : 'Be there when the map goes live.')
  const sub = de
    ? 'Trag deine Email ein. Du kriegst Bescheid wenn’s losgeht.'
    : 'Drop your email. We’ll let you know when it’s on.'
  const placeholder = de ? 'deine@email.com' : 'your@email.com'
  const cta = de ? 'Bescheid sagen' : 'Notify me'
  const thanks = de ? 'Danke ✓' : 'Thanks ✓'
  const errorMsg = de ? 'Hat nicht geklappt — bitte nochmal.' : 'Something went wrong — please try again.'

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

  return (
    <aside className={styles.cta} aria-label={finalTitle}>
      <div className={styles.kicker}>{finalKicker}</div>
      <h2 className={styles.title}>{finalTitle}</h2>
      <p className={styles.sub}>{sub}</p>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <input
          type="email"
          name="email"
          placeholder={placeholder}
          aria-label={de ? 'E-Mail' : 'Email'}
          required
          autoComplete="email"
          disabled={submitting || submitted}
          className={styles.input}
        />
        <button
          type="submit"
          disabled={submitting || submitted}
          className={styles.btn}
        >
          {submitted ? thanks : cta}
        </button>
      </form>
      {hasError && (
        <div className={styles.error} role="alert">{errorMsg}</div>
      )}
    </aside>
  )
}
