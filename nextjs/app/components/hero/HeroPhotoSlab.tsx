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
      <div className={styles.gradient} aria-hidden="true" />
      <div className={styles.wordmarkBlock}>
        <h1 className={styles.wordmark}>Eat This</h1>
        <p className={styles.subTag}>We tell you what to eat</p>
      </div>
      <HeroScrollHint />
    </section>
  )
}
