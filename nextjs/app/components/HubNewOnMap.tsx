import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { normalizeName } from '@/lib/normalizeName'
import type { NewOnMapCard } from '@/lib/home/getHomeData'
import styles from './HubNewOnMap.module.css'

interface Props {
  cards: NewOnMapCard[]
}

export default function HubNewOnMap({ cards }: Props) {
  if (cards.length === 0) return null
  return (
    <section className={styles.section} data-hub-newonmap="">
      <h2 className={styles.heading}>Neu auf der Map</h2>
      <p className={styles.meta}>
        <Link href="/map" rel="nofollow" className={styles.metaLink}>
          Alle neuen Spots →
        </Link>
      </p>
      <ul className={styles.cards} role="list">
        {cards.map((c) => (
          <li key={c._id} className={styles.cardItem}>
            <Link href={`/map?r=${c.slug}`} rel="nofollow" className={styles.card}>
              <div className={styles.cardImage}>
                {c.image && (
                  <Image src={c.image} alt="" fill sizes="(max-width: 720px) 50vw, 320px" />
                )}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardName}>{normalizeName(c.name)}</h3>
                {(c.district || c.category) && (
                  <p className={styles.cardMeta}>
                    {[c.district, c.category].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
