import Image from 'next/image'
import Link from 'next/link'
import styles from './HeroSection.module.css'

// Hero — logo lockup carries the whole brand statement (BERLIN · EAT THIS ·
// "we tell you what to eat" is baked into the asset). One CTA below: open
// the trial map (no signup wall).
export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.logoWrap}>
        {/* Two assets — same lockup, tagline ink colour swapped (black on
            light, white on dark). CSS toggles which is visible. */}
        <Image
          src="/pics/hero_logo.webp"
          alt="Eat This"
          width={1080}
          height={1080}
          className={`${styles.logo} ${styles.logoLight}`}
          priority
          sizes="(max-width: 768px) 96vw, min(820px, 76vw)"
        />
        <Image
          src="/pics/hero_logo_dark.webp"
          alt=""
          width={1080}
          height={1080}
          className={`${styles.logo} ${styles.logoDark}`}
          priority
          sizes="(max-width: 768px) 96vw, min(820px, 76vw)"
          aria-hidden="true"
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
