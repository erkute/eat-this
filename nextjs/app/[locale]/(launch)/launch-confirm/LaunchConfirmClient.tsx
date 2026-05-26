'use client'

import { useEffect, useState } from 'react'
import styles from './confirm.module.css'

interface Props {
  locale: 'de' | 'en'
}

type Status = 'verifying' | 'confirmed' | 'expired' | 'invalid' | 'error'

const COPY = {
  de: {
    verifying: 'Bestätige Anmeldung …',
    confirmedTitle: 'Du bist drin.',
    confirmedSub: 'Wir melden uns sobald die Map aufmacht.',
    expiredTitle: 'Link abgelaufen.',
    expiredSub: 'Trag deine E-Mail nochmal auf der Startseite ein, dann schicken wir dir einen frischen Bestätigungs-Link.',
    invalidTitle: 'Hmm, das passt nicht.',
    invalidSub: 'Der Link sieht kaputt aus. Trag deine E-Mail einfach nochmal auf der Startseite ein.',
    errorTitle: 'Hat nicht geklappt.',
    errorSub: 'Versuch es in ein paar Minuten nochmal — oder trag dich erneut auf der Startseite ein.',
    cta: 'Zur Startseite',
  },
  en: {
    verifying: 'Confirming …',
    confirmedTitle: 'You are in.',
    confirmedSub: 'We will reach out when the map opens.',
    expiredTitle: 'Link expired.',
    expiredSub: 'Drop your email again on the homepage and we will send you a fresh confirmation link.',
    invalidTitle: 'That doesn’t look right.',
    invalidSub: 'The link seems broken. Just enter your email again on the homepage.',
    errorTitle: 'Something went wrong.',
    errorSub: 'Try again in a couple of minutes — or sign up again on the homepage.',
    cta: 'Back to start',
  },
} as const

export default function LaunchConfirmClient({ locale }: Props) {
  const t = COPY[locale]
  const [status, setStatus] = useState<Status>('verifying')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) {
      setStatus('invalid')
      return
    }

    let cancelled = false
    fetch(`/api/launch-confirm?token=${encodeURIComponent(token)}`)
      .then(async res => {
        if (cancelled) return
        if (res.ok) {
          setStatus('confirmed')
          return
        }
        const body = await res.json().catch(() => ({}))
        if (body?.error === 'expired') setStatus('expired')
        else if (body?.error === 'bad_signature' || body?.error === 'malformed' || body?.error === 'invalid_payload' || body?.error === 'missing_token') {
          setStatus('invalid')
        } else {
          setStatus('error')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => { cancelled = true }
  }, [])

  const title =
    status === 'confirmed' ? t.confirmedTitle
    : status === 'expired' ? t.expiredTitle
    : status === 'invalid' ? t.invalidTitle
    : status === 'error' ? t.errorTitle
    : null

  const sub =
    status === 'confirmed' ? t.confirmedSub
    : status === 'expired' ? t.expiredSub
    : status === 'invalid' ? t.invalidSub
    : status === 'error' ? t.errorSub
    : null

  const homeHref = locale === 'en' ? '/en' : '/'

  return (
    <main className={styles.page}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pics/launch-banner.webp?v=2"
        alt="Eat This"
        className={styles.brand}
        width="1035"
        height="975"
        loading="eager"
        decoding="async"
      />

      {status === 'verifying' ? (
        <p className={styles.status}>{t.verifying}</p>
      ) : (
        <>
          <h1 className={status === 'confirmed' ? styles.titleSuccess : styles.title}>
            {title}
          </h1>
          <p className={styles.sub}>{sub}</p>
          <a href={homeHref} className={styles.cta}>
            {t.cta} →
          </a>
        </>
      )}
    </main>
  )
}
