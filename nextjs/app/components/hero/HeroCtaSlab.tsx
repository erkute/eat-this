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

  const stats    = locale === 'de'
    ? 'Berlin · 150+ Must Eats · 200+ Restaurants'
    : 'Berlin · 150+ Must Eats · 200+ Restaurants'
  const headline = locale === 'de'
    ? 'Wahrscheinlich der beste Foodguide, den du kennst.'
    : 'Probably the best foodguide you know.'
  const subtitle = locale === 'de'
    ? 'Eine kuratierte Sammlung der besten Berliner Restaurants und Cafés.'
    : 'A curated collection of Berlin’s best restaurants and cafés.'
  const submitLabel = locale === 'de' ? 'Registriere dich' : 'Sign up'

  return (
    <section className={styles.slab}>
      <div className={styles.inner}>
        <p className={styles.stats}>{stats}</p>
        <h2 className={styles.headline}>{headline}</h2>
        <p className={styles.subtitle}>{subtitle}</p>

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
              {state === 'sending' ? t('landing.sending') : submitLabel}
            </button>
          </form>
        )}
        {state === 'error' && <p className={styles.error}>{errorMessage}</p>}
      </div>
    </section>
  )
}
