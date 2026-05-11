'use client'

import { useState } from 'react'
import { useMagicLink } from '@/lib/auth'
import { useTranslation } from '@/lib/i18n'
import styles from './HeroCtaSlab.module.css'

interface Props {
  locale?: 'de' | 'en'
}

export default function HeroCtaSlab({ locale = 'de' }: Props) {
  const { t } = useTranslation()
  const { sendLink, state, errorMessage } = useMagicLink()
  const [email, setEmail] = useState('')

  const eyebrow = locale === 'de' ? 'KLINGT GUT?' : 'SOUNDS GOOD?'
  const headline = locale === 'de' ? 'Dann sind wir uns einig.' : 'Then we agree.'
  const sendLabel = locale === 'de' ? 'Los geht’s' : 'Get started'

  return (
    <section className={styles.slab}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.headline}>{headline}</h2>

        {state === 'sent' ? (
          <p className={styles.magicSent}>{t('landing.magicSent')}</p>
        ) : (
          <form
            className={styles.form}
            onSubmit={(e) => { e.preventDefault(); sendLink(email) }}
          >
            <input
              className={styles.input}
              type="email"
              placeholder={t('landing.newsletterEmailPlaceholder')}
              aria-label={t('landing.emailAriaLabel')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={state === 'sending'}
            />
            <button
              type="submit"
              className={styles.button}
              disabled={state === 'sending'}
            >
              {state === 'sending' ? t('landing.sending') : sendLabel}
              <ChevronIcon />
            </button>
          </form>
        )}
        {state === 'error' && <p className={styles.error}>{errorMessage}</p>}
      </div>
    </section>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
