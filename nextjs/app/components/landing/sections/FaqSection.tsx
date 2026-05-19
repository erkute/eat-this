'use client'

import { useState } from 'react'
import { getLandingFaqs } from '@/lib/landing/faqs'
import styles from './FaqSection.module.css'

interface Props {
  locale: 'de' | 'en'
}

export default function FaqSection({ locale }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const items = getLandingFaqs(locale)

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.masthead}>
          <p className={styles.eyebrow}>FAQ</p>
          <h2 className={styles.wordmark}>
            {locale === 'de'
              ? (<>Häufige<br />Fragen.</>)
              : (<>Frequently<br />asked.</>)}
          </h2>
        </header>
        <ul className={styles.list}>
          {items.map((item, i) => {
            const open = openIdx === i
            return (
              <li
                key={i}
                className={`${styles.item} ${open ? styles.itemOpen : ''}`}
              >
                <button
                  type="button"
                  className={styles.q}
                  onClick={() => setOpenIdx(open ? null : i)}
                  aria-expanded={open}
                >
                  <span>{item.q}</span>
                  <span className={styles.icon} aria-hidden="true">
                    {open ? '-' : '+'}
                  </span>
                </button>
                {open && <p className={styles.a}>{item.a}</p>}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
