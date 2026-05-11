import Link from 'next/link'
import styles from './FinalCtaSection.module.css'

interface Props {
  headline: string
  body?: string
  ctaLabel: string
  ctaHref: string
}

export default function FinalCtaSection({ headline, body, ctaLabel, ctaHref }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.h2}>{headline}</h2>
        {body && <p className={styles.body}>{body}</p>}
        <Link href={ctaHref} className={styles.cta}>{ctaLabel}</Link>
      </div>
    </section>
  )
}
