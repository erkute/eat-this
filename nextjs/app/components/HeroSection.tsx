import Image from 'next/image'
import Link from 'next/link'
import styles from './HeroSection.module.css'

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.logoWrap}>
        <Image
          src="/pics/eat-this.webp"
          alt="Eat This"
          width={2000}
          height={2000}
          className={`${styles.logo} ${styles.logoLight}`}
          priority
          sizes="(max-width: 768px) 96vw, min(820px, 76vw)"
        />
        <Image
          src="/pics/eat-this-dark.webp"
          alt=""
          aria-hidden="true"
          width={2000}
          height={2000}
          className={`${styles.logo} ${styles.logoDark}`}
          priority
          sizes="(max-width: 768px) 96vw, min(820px, 76vw)"
        />
      </div>

      <Link href="/map" className={styles.cta}>
        <span>Open Map</span>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M4 11h13M12 5l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </section>
  )
}
