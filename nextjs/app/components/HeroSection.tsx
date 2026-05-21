'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import styles from './HeroSection.module.css'

type Locale = 'de' | 'en'

const COPY: Record<Locale, { ctaPrimary: string }> = {
  de: { ctaPrimary: 'Map öffnen' },
  en: { ctaPrimary: 'Open Map' },
}

export default function HeroSection() {
  const locale = (useLocale() === 'en' ? 'en' : 'de') as Locale
  const copy = COPY[locale]

  return (
    <section className={styles.hero} aria-label="Eat This — Berlin">
      <div className={styles.coverFrame}>
        <Image
          src="/pics/cover.webp"
          alt="EAT THIS"
          width={828}
          height={1112}
          className={styles.cover}
          priority
          sizes="92vw"
        />
      </div>
      <div className={styles.cover2Frame}>
        <Image
          src="/pics/cover2.webp"
          alt="The map for people, who care about food."
          width={1141}
          height={752}
          className={styles.cover2}
          priority
          sizes="(max-width: 767px) 92vw, 100vw"
        />
      </div>
      <Link href="/map" className={styles.cta}>
        {copy.ctaPrimary}
      </Link>
    </section>
  )
}
