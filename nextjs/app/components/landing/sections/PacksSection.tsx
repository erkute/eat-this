'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useMagicLink } from '@/lib/auth'
import { useTranslation } from '@/lib/i18n'
import styles from './PacksSection.module.css'

interface Tier {
  title: string
  body: string
  bullets?: string[]
  ctaLabel: string
}

interface Props {
  headline: string
  body?: string
  starter: Tier
  category: Tier
  complete: Tier
  starterHref: string  // unused now (Starter is email-capture); kept for prop compatibility
  locale: 'de' | 'en'
}

// Brand assets in /public/pics/booster/. The 5 category packs each get
// their own card-art (booster_<slug>.png) that says "BREAKFAST PACK" etc.
// More can be added by dropping the file + adding the slug here.
const CATEGORY_PACKS: { slug: string; labelDe: string; labelEn: string }[] = [
  { slug: 'breakfast', labelDe: 'Frühstück', labelEn: 'Breakfast' },
  { slug: 'coffee',    labelDe: 'Coffee',    labelEn: 'Coffee' },
  { slug: 'dinner',    labelDe: 'Dinner',    labelEn: 'Dinner' },
  { slug: 'drinks',    labelDe: 'Drinks',    labelEn: 'Drinks' },
  { slug: 'fastfood',  labelDe: 'Fast Food', labelEn: 'Fast Food' },
]

// All pack images for the Complete-Berlin fan. Starter (booster.png) +
// the 5 category packs. The fan layout rotates each one around the bottom.
const COMPLETE_FAN = [
  '/pics/booster/booster.png',
  ...CATEGORY_PACKS.map((c) => `/pics/booster/booster_${c.slug}.png`),
]

export default function PacksSection({
  headline, body, starter, category, complete, locale,
}: Props) {
  const { t } = useTranslation()
  const { sendLink, state, errorMessage } = useMagicLink()
  const [email, setEmail] = useState('')

  const openWaitlist = (packType: 'category' | 'complete') => {
    if (typeof window !== 'undefined' && window.openWaitlistModal) {
      window.openWaitlistModal({ packType })
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.h2}>{headline}</h2>
          {body && <p className={styles.body}>{body}</p>}
        </div>
        <div className={styles.grid}>

          {/* ── Starter — primary, real, email-capture ─────────────────────── */}
          <article className={`${styles.card} ${styles.cardPrimary}`}>
            <span className={styles.badge}>{locale === 'de' ? 'Verfügbar' : 'Available now'}</span>
            <div className={styles.starterArt}>
              <Image
                src="/pics/booster/booster.png"
                alt=""
                width={400}
                height={600}
                className={styles.starterImg}
                sizes="(max-width: 768px) 60vw, 240px"
              />
            </div>
            <h3 className={styles.cardTitle}>{starter.title}</h3>
            <p className={styles.cardBody}>{starter.body}</p>
            {state === 'sent' ? (
              <p className={styles.magicSent}>{t('landing.magicSent')}</p>
            ) : (
              <form
                className={styles.starterForm}
                onSubmit={(e) => { e.preventDefault(); sendLink(email); }}
              >
                <input
                  className={styles.starterInput}
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
                  className={styles.ctaPrimary}
                  disabled={state === 'sending'}
                >
                  {state === 'sending' ? t('landing.sending') : starter.ctaLabel}
                </button>
                {state === 'error' && <p className={styles.magicError}>{errorMessage}</p>}
              </form>
            )}
          </article>

          {/* ── Category Packs — secondary, all 5 packs visible in viewport ──── */}
          <article className={styles.card}>
            <span className={`${styles.badge} ${styles.badgeSoon}`}>{locale === 'de' ? 'Bald' : 'Coming soon'}</span>
            <h3 className={styles.cardTitle}>{category.title}</h3>
            <p className={styles.cardBody}>{category.body}</p>
            <ul className={styles.packGrid} aria-label={locale === 'de' ? 'Verfügbare Pack-Kategorien' : 'Available pack categories'}>
              {CATEGORY_PACKS.map((v) => (
                <li key={v.slug} className={styles.packGridItem}>
                  <Image
                    src={`/pics/booster/booster_${v.slug}.png`}
                    alt=""
                    width={400}
                    height={600}
                    className={styles.packGridImg}
                    sizes="(max-width: 768px) 28vw, 90px"
                  />
                  <span className={styles.packGridLabel}>{locale === 'de' ? v.labelDe : v.labelEn}</span>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.ctaSecondary} onClick={() => openWaitlist('category')}>
              {category.ctaLabel}
            </button>
          </article>

          {/* ── Complete Berlin — secondary, fan of all packs ──────────────── */}
          <article className={styles.card}>
            <span className={`${styles.badge} ${styles.badgeSoon}`}>{locale === 'de' ? 'Bald' : 'Coming soon'}</span>
            <div className={styles.completeFan} aria-hidden="true">
              {COMPLETE_FAN.map((src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  width={400}
                  height={600}
                  className={`${styles.fanCard} ${styles[`fanCard${i + 1}`]}`}
                  sizes="(max-width: 768px) 30vw, 130px"
                />
              ))}
            </div>
            <h3 className={styles.cardTitle}>{complete.title}</h3>
            <p className={styles.cardBody}>{complete.body}</p>
            {complete.bullets && complete.bullets.length > 0 && (
              <ul className={styles.cardList}>
                {complete.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            )}
            <button type="button" className={styles.ctaSecondary} onClick={() => openWaitlist('complete')}>
              {complete.ctaLabel}
            </button>
          </article>
        </div>
      </div>
    </section>
  )
}
