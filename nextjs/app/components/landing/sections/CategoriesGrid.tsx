import Link from 'next/link'
import Image from 'next/image'
import type { CategoryGridTile } from '@/lib/types'
import styles from './CategoriesGrid.module.css'

interface Props {
  headline: string
  categories: CategoryGridTile[]
  locale: 'de' | 'en'
}

// Slug → display name for the booster-pack label. Always English: the
// user wants the badge to read like the print on the pack ("Sweets Pack",
// not "Süsses Pack") regardless of UI locale. Also serves as the source
// of truth for which slugs ship with pack art.
const PACK_LABEL: Record<string, string> = {
  breakfast:  'Breakfast',
  coffee:     'Coffee',
  dinner:     'Dinner',
  drinks:     'Drinks',
  fastfood:   'Fast Food',
  finedining: 'Fine Dining',
  lunch:      'Lunch',
  pizza:      'Pizza',
  sweets:     'Sweets',
}

function boosterImageFor(slug: string): string | null {
  const normalized = slug.replace(/-/g, '').toLowerCase()
  return normalized in PACK_LABEL ? `/pics/booster/booster_${normalized}.webp` : null
}

function displayLabelFor(slug: string, fallback: string): string {
  const normalized = slug.replace(/-/g, '').toLowerCase()
  return PACK_LABEL[normalized] || fallback
}

export default function CategoriesGrid({ headline, categories, locale }: Props) {
  // Override the CMS headline with a punchier editorial line that doubles
  // as a hook for the booster-pack lineup below. The body underneath
  // tells users what each pack actually unlocks.
  const sectionEyebrow = locale === 'de' ? 'Die Packs' : 'The Packs'
  const sectionTitle = locale === 'de'
    ? 'Berlin in 9 Packs'
    : 'Berlin in 9 Packs'
  const sectionLead = locale === 'de'
    ? 'Jedes Pack ist eine kuratierte Sammlung von Spots aus einer Kategorie. Tippe ein Pack, finde deine nächste Mahlzeit.'
    : 'Each pack is a curated collection of spots from one category. Tap a pack, find your next meal.'
  void headline
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <span className={styles.eyebrow}>{sectionEyebrow}</span>
        <h2 className={styles.h2}>{sectionTitle}</h2>
        <p className={styles.lead}>{sectionLead}</p>
        <ul className={styles.grid}>
          {categories.map((cat) => {
            const href = locale === 'de' ? `/?cat=${cat.slug}` : `/${locale}?cat=${cat.slug}`
            const boosterSrc = boosterImageFor(cat.slug)
            const imgSrc = boosterSrc || cat.iconUrl
            const isBooster = Boolean(boosterSrc)
            const label = displayLabelFor(cat.slug, cat.name)
            return (
              <li key={cat._id}>
                <Link href={href} className={styles.tile}>
                  <span className={styles.tileLabel}>{label} Pack</span>
                  <div
                    className={`${styles.tileImgWrap} ${isBooster ? styles.tileImgPack : ''}`}
                  >
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
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
