import Image from 'next/image'
import Link from 'next/link'
import styles from './MapPreviewSection.module.css'

interface Props {
  headline: string
  body: string
  screenshotUrl?: string
  ctaLabel: string
  ctaHref: string
}

export default function MapPreviewSection({ headline, body, screenshotUrl, ctaLabel, ctaHref }: Props) {
  const src = screenshotUrl || '/pics/map-teaser/map_umgebung.webp'
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.text}>
          <h2 className={styles.h2}>{headline}</h2>
          <p className={styles.body}>{body}</p>
          <Link href={ctaHref} className={styles.cta}>{ctaLabel} →</Link>
        </div>
        <div className={styles.visual}>
          <Image
            src={src}
            alt=""
            width={596}
            height={1227}
            className={styles.screenshot}
            sizes="(max-width: 768px) 80vw, 480px"
          />
        </div>
      </div>
    </section>
  )
}
