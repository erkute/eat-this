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
          width={848}
          height={909}
          className={`${styles.logo} ${styles.logoLight}`}
          priority
          sizes="(max-width: 768px) 96vw, min(820px, 76vw)"
        />
        <Image
          src="/pics/eat-this-dark.webp"
          alt=""
          aria-hidden="true"
          width={848}
          height={909}
          className={`${styles.logo} ${styles.logoDark}`}
          priority
          sizes="(max-width: 768px) 96vw, min(820px, 76vw)"
        />
      </div>

      <Link href="/map" className={styles.cta}>
        <span>Open Map</span>
        <svg className={styles.arrow} width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12 L28 12" />
          <path d="M22 4 L32 12 L22 20" />
        </svg>
      </Link>
    </section>
  )
}
