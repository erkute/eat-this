import Image from 'next/image'
import styles from './HeroProductSlab.module.css'

// Slab 5 picks: max 1 Pizza, 0 Döner, distinct dominant colours so the
// trio reads as variety (orange pizza, gray-rose sausage, fresh banh-mi).
const CARD_LEFT  = 'https://cdn.sanity.io/images/ehwjnjr2/production/7d58817e5ac7298642bdc2816944e5f64468e713-1449x2163.png' // Pizza — Gemello
const CARD_RIGHT = 'https://cdn.sanity.io/images/ehwjnjr2/production/70e13f906df3aa37dd062fc6d83034ded924b1ae-1449x2163.png' // Spicy Thai Sausage — Bar Basta
const CARD_FAR   = 'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png' // Banh Mi — Saveur

export default function HeroProductSlab() {
  return (
    <section className={styles.slab} aria-hidden="true">
      <div className={styles.stage}>
        <span className={styles.backdrop} aria-hidden="true" />

        <Image
          src="/pics/card-back.webp"
          alt=""
          width={621}
          height={951}
          className={`${styles.fanCard} ${styles.fanCardBack}`}
          sizes="(max-width: 768px) 22vw, 11vw"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CARD_FAR}
          alt=""
          className={`${styles.fanCard} ${styles.fanCardBackFar}`}
          loading="lazy"
          decoding="async"
        />

        <Image
          src="/pics/map-teaser/map_umgebung.webp"
          alt=""
          width={596}
          height={1227}
          className={`${styles.phone} ${styles.phoneFront}`}
          sizes="(max-width: 768px) 38vw, 20vw"
        />
        <Image
          src="/pics/map-teaser/map_restaurant.webp"
          alt=""
          width={596}
          height={1227}
          className={`${styles.phone} ${styles.phoneBack}`}
          sizes="(max-width: 768px) 36vw, 19vw"
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CARD_LEFT}
          alt=""
          className={`${styles.fanCard} ${styles.fanCardFront}`}
          loading="lazy"
          decoding="async"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CARD_RIGHT}
          alt=""
          className={`${styles.fanCard} ${styles.fanCardFrontFar}`}
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>
  )
}
