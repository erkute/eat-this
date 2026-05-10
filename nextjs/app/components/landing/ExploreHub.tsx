import { getLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getAllBezirkeWithStats, getAllCategories, getCategoryCounts } from '@/lib/sanity.server'
import { localizedCategoryName } from '@/lib/categories'
import styles from './landing.module.css'

export default async function ExploreHub() {
  const locale = await getLocale()
  const de = locale === 'de'
  const loc = de ? 'de' : 'en'

  const [bezirke, categories, categoryCounts] = await Promise.all([
    getAllBezirkeWithStats(),
    getAllCategories(),
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
              {categories.map(c => {
                const count = categoryCounts[c.slug] ?? 0
                return (
                  <li key={c.slug}>
                    <Link href={`/kategorie/${c.slug}`} className={styles.explorePill}>
                      {localizedCategoryName(c, loc)}
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
