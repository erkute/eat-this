import Link from 'next/link'
import Image from 'next/image'
import type { CategoryGridTile } from '@/lib/types'
import { localizedCategoryName } from '@/lib/categories'
import styles from './CategoriesGrid.module.css'

interface Props {
  headline: string
  categories: CategoryGridTile[]
  locale: 'de' | 'en'
}

// Slug → booster-pack-illustration filename. The illustrations live at
// /pics/booster/booster_<key>.png. Categories without a booster pack yet
// fall back to the category-doc's `iconUrl`. Add new entries here as
// illustrations arrive.
const BOOSTER_FILES = new Set(['breakfast', 'coffee', 'dinner', 'drinks', 'fastfood'])

function boosterImageFor(slug: string): string | null {
  const normalized = slug.replace(/-/g, '').toLowerCase()
  return BOOSTER_FILES.has(normalized) ? `/pics/booster/booster_${normalized}.png` : null
}

export default function CategoriesGrid({ headline, categories, locale }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.h2}>{headline}</h2>
        <ul className={styles.grid}>
          {categories.map((cat) => {
            const name = localizedCategoryName(cat, locale)
            const href = locale === 'de' ? `/?cat=${cat.slug}` : `/${locale}?cat=${cat.slug}`
            const boosterSrc = boosterImageFor(cat.slug)
            const imgSrc = boosterSrc || cat.iconUrl
            const isBooster = Boolean(boosterSrc)
            return (
              <li key={cat._id}>
                <Link href={href} className={styles.tile}>
                  <div className={`${styles.tileImgWrap} ${isBooster ? styles.tileImgPack : ''}`}>
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt=""
                        width={400}
                        height={600}
                        className={isBooster ? styles.tilePackImg : styles.tileIconImg}
                        sizes="(max-width: 768px) 30vw, 200px"
                      />
                    ) : (
                      <div className={styles.tilePlaceholder} aria-hidden="true" />
                    )}
                  </div>
                  <span className={styles.tileLabel}>{name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
