import Link from 'next/link'
import Image from 'next/image'
import type { RecentlyAddedCard } from '@/lib/types'
import RecentlyAddedSectionCta from './RecentlyAddedSectionCta'
import styles from './RecentlyAddedSection.module.css'

interface Props {
  headline: string
  body?: string
  sectionCtaLabel?: string
  cards: RecentlyAddedCard[]
  locale: 'de' | 'en'
}

export default function RecentlyAddedSection({
  headline, body, sectionCtaLabel, cards, locale,
}: Props) {
  const withImage = cards.filter((c) => Boolean(c.imageUrl)).slice(0, 8)
  if (withImage.length === 0) return null

  // Eyebrow uses "Neu", the h2 from CMS still says "Frisch
  // hinzugefügt" - no more doubled "Frisch" framing. Body is overridden
  // with a punchier line; CMS body is kept in srOnly for crawlers.
  const eyebrow = locale === 'de' ? 'Neu' : 'New'
  const overriddenBody = locale === 'de'
    ? 'Vom Frühstücks-Spot bis zum Fine-Dining-Pick - jede Empfehlung handverlesen, direkt auf der Map.'
    : 'Breakfast spots to fine-dining picks - every recommendation hand-picked, right on the map.'

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{eyebrow}</span>
            <h2 className={styles.h2}>{headline.replace(/\.$/, '')}</h2>
            <p className={styles.body}>{overriddenBody}</p>
            {body && <span className={styles.srOnly}>{body}</span>}
          </div>
        </div>
        <ul className={styles.rail} role="list">
          {withImage.map((card) => {
            const href = locale === 'de' ? card.href : `/${locale}${card.href}`
            return (
              <li key={card._id} className={styles.card}>
                <Link href={href} className={styles.cardLink}>
                  <div className={styles.cardImg}>
                    {card.imageUrl && (
                      <Image
                        src={card.imageUrl}
                        alt=""
                        width={600}
                        height={800}
                        sizes="(max-width: 768px) 70vw, 280px"
                      />
                    )}
                  </div>
                  <div className={styles.cardOverlay} aria-hidden="true" />
                  <div className={styles.cardMeta}>
                    {card.bezirk && (
                      <span className={styles.cardSub}>{card.bezirk}</span>
                    )}
                    <span className={styles.cardName}>{card.name}</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        {sectionCtaLabel && (
          <div className={styles.footer}>
            <RecentlyAddedSectionCta label={sectionCtaLabel} className={styles.cta} />
          </div>
        )}
      </div>
    </section>
  )
}
