import Image from 'next/image'
import Link from 'next/link'
import styles from './HeroSection.module.css'
import HeroScrollHint from './HeroScrollHint'

interface Props {
  headline: string
  body: string
  ctaLabel: string
  ctaHref: string
  heroImageUrl?: string  // unused; kept for CMS prop compatibility
}

export default function HeroSection({ headline, body, ctaLabel, ctaHref }: Props) {
  return (
    <header className={styles.hero}>
      <h1 className={styles.srOnly}>{headline}</h1>

      <Image
        src="/pics/logo.webp"
        alt="EAT THIS"
        width={1815}
        height={576}
        className={styles.logo}
        priority
      />

      <div className={styles.composition}>
        <Image
          src="/pics/the-map-for-people.png"
          alt=""
          width={1200}
          height={900}
          className={styles.typo}
          priority
          sizes="(max-width: 768px) 88vw, 56vw"
        />
        <Image
          src="/pics/map-teaser/map_umgebung.webp"
          alt=""
          width={596}
          height={1227}
          className={styles.phone}
          priority
          sizes="(max-width: 768px) 60vw, 28vw"
        />
      </div>

      <p className={styles.body}>{body}</p>

      <Link href={ctaHref} className={styles.cta}>{ctaLabel}</Link>

      <HeroScrollHint />
    </header>
  )
}
