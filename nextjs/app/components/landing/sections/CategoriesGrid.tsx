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

export default function CategoriesGrid({ headline, categories, locale }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.h2}>{headline}</h2>
        <ul className={styles.grid}>
          {categories.map((cat) => {
            const name = localizedCategoryName(cat, locale)
            const href = locale === 'de' ? `/?cat=${cat.slug}` : `/${locale}?cat=${cat.slug}`
            return (
              <li key={cat._id}>
                <Link href={href} className={styles.tile}>
                  {cat.iconUrl ? (
                    <Image
                      src={cat.iconUrl}
                      alt=""
                      width={200}
                      height={200}
                      className={styles.tileImg}
                      sizes="(max-width: 768px) 30vw, 200px"
                    />
                  ) : (
                    <div className={styles.tilePlaceholder} aria-hidden="true" />
                  )}
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
