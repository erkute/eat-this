import { getLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getAllBezirkeWithStats, getCategoryCounts } from '@/lib/sanity.server'
import { CATEGORIES } from '@/lib/categories'
import styles from './landing.module.css'

export default async function ExploreHub() {
  const locale = await getLocale()
  const de = locale === 'de'

  const [bezirke, categoryCounts] = await Promise.all([
    getAllBezirkeWithStats(),
    getCategoryCounts(),
  ])

  return (
    <section className={styles.explore}>
      <div className={styles.exploreInner}>
        <span className={styles.secLabel}>{de ? 'Entdecken' : 'Explore'}</span>
        <h2 className={styles.exploreHeadline}>
          {de ? 'Stöbere durch Berlin' : 'Browse Berlin'}
        </h2>

        <div className={styles.exploreCols}>
          <div className={styles.exploreCol}>
            <h3 className={styles.exploreColTitle}>
              <Link href="/bezirk" className={styles.exploreColLink}>
                {de ? 'Nach Bezirk' : 'By district'}
              </Link>
            </h3>
            <ul className={styles.explorePills}>
              {bezirke.map(b => (
                <li key={b._id}>
                  <Link href={`/bezirk/${b.slug}`} className={styles.explorePill}>
                    {b.name}
                    {typeof b.restaurantCount === 'number' && b.restaurantCount > 0 ? (
                      <span className={styles.explorePillCount}>{b.restaurantCount}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.exploreCol}>
            <h3 className={styles.exploreColTitle}>
              <Link href="/kategorie" className={styles.exploreColLink}>
                {de ? 'Nach Anlass' : 'By occasion'}
              </Link>
            </h3>
            <ul className={styles.explorePills}>
              {CATEGORIES.map(c => {
                const count = categoryCounts[c.value] ?? 0
                return (
                  <li key={c.slug}>
                    <Link href={`/kategorie/${c.slug}`} className={styles.explorePill}>
                      {de ? c.labelDe : c.labelEn}
                      {count > 0 ? <span className={styles.explorePillCount}>{count}</span> : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
