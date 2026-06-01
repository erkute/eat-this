import { Link } from '@/i18n/navigation'
import { CATALOG } from '@/lib/stripe-catalog'
import { categoryArt } from '@/lib/categoryArt'
import styles from './HubAllBerlin.module.css'

function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

export default function HubAllBerlin() {
  const categoryPacks = Object.values(CATALOG).filter((p) => p.type === 'category' && p.slug)
  const allBerlin = CATALOG['all-berlin']
  const sumCents = categoryPacks.reduce((s, p) => s + p.amountCents, 0)
  const fanArt = categoryPacks
    .map((p) => categoryArt(p.slug as string))
    .filter((a): a is string => Boolean(a))

  return (
    <section className={styles.section} data-hub-allberlin="">
      <p className={styles.kicker}>Berlin · Komplett</p>
      <h2 className={styles.heading}>All<br />Berlin</h2>
      <div className={styles.fan}>
        {fanArt.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt="" loading="lazy" />
        ))}
      </div>
      <p className={styles.copy}>
        Alle neun Booster Packs in einem. Alle Kategorien dabei, jeder Spot drauf.{' '}
        <strong>Plus alle Updates</strong> — neue Spots und Must Eats landen automatisch auf deiner Map.
      </p>
      <div className={styles.priceRow}>
        <span className={styles.strike}>{formatPrice(sumCents)}</span>
        <span className={styles.price}>{formatPrice(allBerlin.amountCents)}</span>
        <span className={styles.save}>Spar {formatPrice(sumCents - allBerlin.amountCents)}</span>
      </div>
      <Link href="/map" rel="nofollow" aria-label="All Berlin freischalten" className={styles.cta}>Holen →</Link>
    </section>
  )
}
