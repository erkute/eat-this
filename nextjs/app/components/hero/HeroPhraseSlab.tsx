import Image from 'next/image'
import styles from './HeroPhraseSlab.module.css'

export default function HeroPhraseSlab() {
  return (
    <section className={styles.slab}>
      <Image
        src="/pics/the-map-for-people.png"
        alt="the map for people who care about food"
        width={1600}
        height={900}
        priority={false}
        sizes="(max-width: 768px) 90vw, 1100px"
        className={styles.art}
      />
    </section>
  )
}
