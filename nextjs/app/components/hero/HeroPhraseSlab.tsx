import styles from './HeroPhraseSlab.module.css'

export default function HeroPhraseSlab() {
  return (
    <section className={styles.slab}>
      <h2 className={styles.phrase}>
        <span className={styles.lineA}>the map for people</span>
        <span className={styles.lineB}>who care about food</span>
      </h2>
    </section>
  )
}
