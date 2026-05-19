'use client'

import { useState } from 'react'
import type { FAQEntry } from '@/lib/restaurant-prose'
import styles from './RestaurantFAQ.module.css'

interface Props {
  entries: FAQEntry[]
  locale: 'de' | 'en'
}

/**
 * Restaurant detail FAQ accordion. Closed by default — keeps the magazine
 * layout breathable while the questions still feed the FAQPage JSON-LD
 * schema and the page's content-depth signal. First-time interaction
 * opens an answer; clicking the same question closes it.
 *
 * Pattern mirrors the landing FaqSection so the toggle behavior is
 * consistent across the site.
 */
export default function RestaurantFAQ({ entries, locale }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  if (entries.length === 0) return null

  return (
    <section className={styles.faq} aria-label={locale === 'de' ? 'Häufige Fragen' : 'Frequently asked'}>
      <h2 className={styles.heading}>
        {locale === 'de' ? 'Häufige Fragen' : 'Frequently asked'}
      </h2>
      <ul className={styles.list} role="list">
        {entries.map((entry, i) => {
          const open = openIdx === i
          return (
            <li key={i} className={`${styles.item} ${open ? styles.itemOpen : ''}`}>
              <button
                type="button"
                className={styles.q}
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
              >
                <span className={styles.qText}>{entry.question}</span>
                <span className={styles.icon} aria-hidden="true">
                  {open ? '–' : '+'}
                </span>
              </button>
              {open && <p className={styles.a}>{entry.answer}</p>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
