import Image from 'next/image'
import Link from 'next/link'
import styles from './FinalCtaSection.module.css'

export default function FinalCtaSection() {
  return (
    <section className={styles.section} aria-labelledby="final-cta-headline">
      <h2 id="final-cta-headline" className={styles.h2}>
        <Image
          src="/pics/slogan.webp"
          alt="We tell you what to eat."
          width={1280}
          height={320}
          className={styles.sloganImg}
          sizes="(max-width: 768px) 88vw, min(720px, 60vw)"
        />
      </h2>
      <Link href="/map" className={styles.cta}>
        Open Map
        <span aria-hidden="true" className={styles.arrow}>→</span>
      </Link>
    </section>
  )
}
