import Image from 'next/image'
import HeroScrollHint from '../HeroScrollHint'
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
      <HeroScrollHint />
    </section>
  )
}
