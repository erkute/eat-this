import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { CATALOG } from '@/lib/stripe-catalog'
import { categoryArt } from '@/lib/categoryArt'
import styles from './HubPacks.module.css'

interface Props {
  categoryNames: Record<string, string>
}

const GIFT_ART = '/pics/booster/booster_free.webp'

function formatPrice(amountCents: number): string {
  return `€${(amountCents / 100).toFixed(2).replace('.', ',')}`
}

export default function HubPacks({ categoryNames }: Props) {
  const categoryPacks = Object.values(CATALOG).filter((p) => p.type === 'category' && p.slug)
  return (
    <section className={styles.section} data-hub-packs="">
      <h2 className={styles.heading}>Booster Packs</h2>
      <div className={styles.scroller}>
        <article className={`${styles.pack} ${styles.gift}`}>
          <div className={styles.packArt}>
            <Image src={GIFT_ART} alt="" fill sizes="200px" className={styles.artImg} />
          </div>
          <p className={styles.packCat}>Booster Pack</p>
          <h3 className={styles.packName}>Welcome Pack</h3>
          <p className={styles.packMeta}>
            Weitere kuratierte Spots samt Must Eats — direkt nach deiner Anmeldung.
          </p>
          <Link href="/login" className={styles.giftCta}>Anmelden →</Link>
        </article>
        {categoryPacks.map((p) => {
          const slug = p.slug as string
          const name = categoryNames[slug] ?? p.displayName
          const art = categoryArt(slug)
          return (
            <article key={p.packId} className={styles.pack}>
              <div className={styles.packArt}>
                {art && <Image src={art} alt="" fill sizes="200px" className={styles.artImg} />}
              </div>
              <p className={styles.packCat}>Pack · {name}</p>
              <h3 className={styles.packName}>{name}</h3>
              <p className={styles.packMeta}>
                <span className={styles.tags}>{p.spectrum}</span>
                {p.description}
              </p>
              <div className={styles.packFoot}>
                <span className={styles.packPrice}>{formatPrice(p.amountCents)}</span>
                <Link href={`/map?cat=${slug}`} rel="nofollow" className={styles.packCta}>
                  Auf die Map →
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
