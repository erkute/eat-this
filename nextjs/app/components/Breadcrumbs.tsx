import { Link } from '@/i18n/navigation';
import styles from './Breadcrumbs.module.css';

export interface BreadcrumbItem {
  name: string;
  /** Locale-relative href (omit on the last item — it renders as current). */
  href?: string;
  logo?: 'eat-this';
}

interface Props {
  items: BreadcrumbItem[];
  ariaLabel: string;
}

function Crumb({ item }: { item: BreadcrumbItem }) {
  if (item.logo !== 'eat-this') return <>{item.name}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/pics/eat-this-logo.webp?v=6" alt={item.name} className={styles.logo} />;
}

export default function Breadcrumbs({ items, ariaLabel }: Props) {
  if (items.length === 0) return null;
  const lastIndex = items.length - 1;

  return (
    <nav aria-label={ariaLabel} className={styles.nav}>
      <ol className={styles.list}>
        {items.map((item, i) => {
          const isLast = i === lastIndex;
          return (
            <li key={i} className={styles.item}>
              {/* The separator leads the crumb it belongs to. Trailing it
                  instead left a dangling › at the end of the line whenever a
                  long name wrapped onto its own row on phones. */}
              {i > 0 && (
                <span className={styles.sep} aria-hidden="true">
                  ›
                </span>
              )}
              {item.href && !isLast ? (
                <Link href={item.href} className={styles.link}>
                  <Crumb item={item} />
                </Link>
              ) : (
                <span className={styles.current} aria-current={isLast ? 'page' : undefined}>
                  <Crumb item={item} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
