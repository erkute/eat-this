import Link from 'next/link'
import Image from 'next/image'
import type { RecentlyAddedCard } from '@/lib/types'
import styles from './RecentlyAddedSection.module.css'

interface Props {
  headline: string
  body?: string
  sectionCtaLabel?: string
  sectionCtaHref: string
  cards: RecentlyAddedCard[]
  locale: 'de' | 'en'
}

function timeAgo(createdAt: string, locale: 'de' | 'en'): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days < 1) return locale === 'de' ? 'heute' : 'today'
  if (days < 7) return locale === 'de' ? `vor ${days} Tg.` : `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return locale === 'de' ? `vor ${weeks} Wo.` : `${weeks}w ago`
  const months = Math.floor(days / 30)
  return locale === 'de' ? `vor ${months} Mon.` : `${months}mo ago`
}

export default function RecentlyAddedSection({
  headline, body, sectionCtaLabel, sectionCtaHref, cards, locale,
}: Props) {
  if (cards.length === 0) return null
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.h2}>{headline}</h2>
          {body && <p className={styles.body}>{body}</p>}
        </div>
        <ul className={styles.rail} role="list">
          {cards.map((card) => {
            const href = locale === 'de' ? card.href : `/${locale}${card.href}`
            return (
              <li key={card._id} className={styles.card}>
                <Link href={href} className={styles.cardLink}>
                  <div className={styles.cardImg}>
                    {card.imageUrl && (
                      <Image
                        src={card.imageUrl}
                        alt=""
                        width={400}
                        height={300}
                        sizes="(max-width: 768px) 70vw, 240px"
                      />
                    )}
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardName}>{card.name}</span>
                    <span className={styles.cardSub}>
                      {card.bezirk ? `${card.bezirk} · ` : ''}{timeAgo(card.createdAt, locale)}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        {sectionCtaLabel && (
          <div className={styles.footer}>
            <Link href={sectionCtaHref} className={styles.cta}>{sectionCtaLabel} →</Link>
          </div>
        )}
      </div>
    </section>
  )
}
