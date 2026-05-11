import Image from 'next/image'
import Link from 'next/link'
import styles from './HeroSection.module.css'
import HeroScrollHint from './HeroScrollHint'

interface Props {
  headline: string
  body: string
  ctaLabel: string
  ctaHref: string
  heroImageUrl?: string
}

export default function HeroSection({ headline, body, ctaLabel, ctaHref, heroImageUrl }: Props) {
  const desktopSrc = heroImageUrl || '/pics/map-promo.webp'
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
      <div className={styles.visualWrap}>
        <Image
          src={desktopSrc}
          alt=""
          width={1536}
          height={1024}
          className={styles.visualDesktop}
          priority
          sizes="(max-width: 768px) 0px, min(1200px, 90vw)"
        />
        <Image
          src="/pics/the-map-for-people.png"
          alt=""
          width={1200}
          height={900}
          className={styles.visualMobileTypo}
          priority
          sizes="(max-width: 768px) 88vw, 0px"
        />
        <Image
          src="/pics/map-teaser/map_restaurant.webp"
          alt=""
          width={596}
          height={1227}
          className={styles.visualMobilePhone}
          priority
          sizes="(max-width: 768px) 72vw, 0px"
        />
      </div>
      <p className={styles.body}>{body}</p>
      <Link href={ctaHref} className={styles.cta}>{ctaLabel}</Link>
      <HeroScrollHint />
    </header>
  )
}
