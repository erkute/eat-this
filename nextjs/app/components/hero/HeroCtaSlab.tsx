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

  /* The 171/9/12 stats line is the eyebrow rendered by HeroSection
     directly under the hero photo, so we don't repeat it here. The
     "Wahrscheinlich der beste Foodguide" line lives in the
     RestaurantTicker section further down - don't repeat that either. */
  const subtitle = locale === 'de'
    ? 'Eine kuratierte Sammlung der besten Berliner Restaurants, Cafés und Bars, inklusive Must Eats.'
    : 'A curated collection of Berlin’s best restaurants, cafés and bars, including Must Eats.'
  const submitLabel = locale === 'de' ? 'Registriere dich' : 'Sign up'

  return (
    <section className={styles.slab}>
      <div className={styles.inner}>
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
