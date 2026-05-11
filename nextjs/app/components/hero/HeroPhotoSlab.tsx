import Image from 'next/image'
import styles from './HeroPhotoSlab.module.css'

export default function HeroPhotoSlab() {
  return (
    <section className={styles.slab} aria-label="Eat This">
      <Image
        src="/pics/hero_desktop1.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className={styles.photoDesktop}
      />
      <Image
        src="/pics/hero_mobile.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className={styles.photoMobile}
      />
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.brandBlock}>
        <Image
          src="/pics/logo2.webp"
          alt="Eat This"
          width={1815}
          height={576}
          priority
          className={styles.logo}
        />
        <p className={styles.tagline}>We tell you what to eat</p>
      </div>
      {/* Passive bouncing chevron pinned to the photo bottom — signals
          "more below" without being a tap target (pointer-events:none). */}
      <div className={styles.scrollHint} aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  )
}
