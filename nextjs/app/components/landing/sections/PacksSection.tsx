'use client'

import Link from 'next/link'
import Image from 'next/image'
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
  starterHref: string
  locale: 'de' | 'en'
}

// Hard-coded brand assets (in nextjs/public/pics/booster/). New illustrations
// can be added by dropping a file named `booster_<slug>.png` and appending the
// slug here. Order = visual order in the category-pack rail.
const CATEGORY_PACK_VISUALS: { slug: string; labelDe: string; labelEn: string }[] = [
  { slug: 'breakfast', labelDe: 'Frühstück',   labelEn: 'Breakfast' },
  { slug: 'coffee',    labelDe: 'Coffee',      labelEn: 'Coffee' },
  { slug: 'dinner',    labelDe: 'Dinner',      labelEn: 'Dinner' },
  { slug: 'drinks',    labelDe: 'Drinks',      labelEn: 'Drinks' },
  { slug: 'fastfood',  labelDe: 'Fast Food',   labelEn: 'Fast Food' },
]

export default function PacksSection({
  headline, body, starter, category, complete, starterHref, locale,
}: Props) {
  const openWaitlist = (packType: 'category' | 'complete') => {
    if (typeof window !== 'undefined' && window.openWaitlistModal) {
      window.openWaitlistModal({ packType })
    }
  }
  const localeHref = (path: string) => (locale === 'de' ? path : `/${locale}${path}`)

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.h2}>{headline}</h2>
          {body && <p className={styles.body}>{body}</p>}
        </div>
        <div className={styles.grid}>
          {/* Starter — primary */}
          <article className={`${styles.card} ${styles.cardPrimary}`}>
            <span className={styles.badge}>{locale === 'de' ? 'Verfügbar' : 'Available now'}</span>
            <h3 className={styles.cardTitle}>{starter.title}</h3>
            <p className={styles.cardBody}>{starter.body}</p>
            <Link href={localeHref(starterHref)} className={styles.ctaPrimary}>{starter.ctaLabel}</Link>
          </article>

          {/* Category — secondary, with pack-visual rail */}
          <article className={styles.card}>
            <span className={`${styles.badge} ${styles.badgeSoon}`}>{locale === 'de' ? 'Bald' : 'Coming soon'}</span>
            <h3 className={styles.cardTitle}>{category.title}</h3>
            <p className={styles.cardBody}>{category.body}</p>
            <ul className={styles.packRail} aria-label={locale === 'de' ? 'Verfügbare Pack-Kategorien' : 'Available pack categories'}>
              {CATEGORY_PACK_VISUALS.map((v) => (
                <li key={v.slug} className={styles.packItem}>
                  <Image
                    src={`/pics/booster/booster_${v.slug}.png`}
                    alt=""
                    width={400}
                    height={600}
                    className={styles.packImg}
                    sizes="(max-width: 768px) 38vw, 140px"
                  />
                  <span className={styles.packLabel}>{locale === 'de' ? v.labelDe : v.labelEn}</span>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.ctaSecondary} onClick={() => openWaitlist('category')}>
              {category.ctaLabel}
            </button>
          </article>

          {/* Complete — secondary */}
          <article className={styles.card}>
            <span className={`${styles.badge} ${styles.badgeSoon}`}>{locale === 'de' ? 'Bald' : 'Coming soon'}</span>
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
