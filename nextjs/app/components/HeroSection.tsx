import Link from 'next/link'
import styles from './HeroSection.module.css'

// BASTA-LUNCH-style Hero — handwritten script + heavy block + script
// accent layered like the BASTA LUNCH wordmark. The whole composition
// drops the visitor onto the map (trial map is open access, 20 spots
// already unlocked — no signup wall between Hero CTA and the product).
// Brand-phrase is intentionally English-only; no locale prop.
export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <p className={styles.scriptEyebrow}>Eat This</p>

      <h1 className={styles.headline} aria-label="the map for people who care about food">
        <span className={styles.line}>the map for people</span>
        <span className={styles.line}>who care about food</span>
      </h1>

      <p className={styles.scriptAccent}>berlin, live.</p>

      <Link href="/map" className={styles.cta}>
        <span>Open the Berlin Map</span>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M4 11h13M12 5l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <p className={styles.ctaHint}>no signup. open the map. eat better.</p>
    </section>
  )
}
