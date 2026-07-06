import { Link } from '@/i18n/navigation'
import styles from './Breadcrumbs.module.css'

export interface BreadcrumbItem {
  name: string
  /** Locale-relative href (omit on the last item — it renders as current). */
  href?: string
  logo?: 'eat-this'
}

interface Props {
  items: BreadcrumbItem[]
  ariaLabel: string
}

export default function Breadcrumbs({ items, ariaLabel }: Props) {
  if (items.length === 0) return null
  const lastIndex = items.length - 1

  return (
    <nav aria-label={ariaLabel} className={styles.nav}>
      <ol className={styles.list}>
        {items.map((item, i) => {
          const isLast = i === lastIndex
          return (
            <li key={i} className={styles.item}>
              {item.href && !isLast ? (
                <Link href={item.href} className={styles.link}>
                  {item.logo === 'eat-this' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/pics/eat-this-logo.webp?v=6" alt={item.name} className={styles.logo} />
                  ) : (
                    item.name
                  )}
                </Link>
              ) : (
                <span className={styles.current} aria-current={isLast ? 'page' : undefined}>
                  {item.logo === 'eat-this' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/pics/eat-this-logo.webp?v=6" alt={item.name} className={styles.logo} />
                  ) : (
                    item.name
                  )}
                </span>
              )}
              {!isLast && (
                <span className={styles.sep} aria-hidden="true">
                  ›
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
