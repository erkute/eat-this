import Link from 'next/link'
import FanCards from '../FanCards'
import styles from './MustEatsSection.module.css'

interface Props {
  headline: string
  body: string
  ctaLabel?: string
  ctaHref?: string
}

export default function MustEatsSection({ headline, body, ctaLabel, ctaHref }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.h2}>{headline}</h2>
          <p className={styles.body}>{body}</p>
          {ctaLabel && ctaHref && (
            <Link href={ctaHref} className={styles.cta}>{ctaLabel} →</Link>
          )}
        </div>
        <div className={styles.fanWrap}>
          <FanCards />
        </div>
      </div>
    </section>
  )
}
