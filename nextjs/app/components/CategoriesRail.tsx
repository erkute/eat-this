import { Link } from '@/i18n/navigation';
import styles from './CategoriesRail.module.css';

interface Props {
  categoryNames: Record<string, string>;
  locale: 'de' | 'en';
}

/**
 * Typographic navigation into the category pages.
 *
 * This rail used to show each category as its booster-pack artwork with an
 * "Öffnen" button pointing at /pack/<slug>. Two problems: it read as a shop to
 * someone who hasn't seen the map yet, and the pack sachets are product shots,
 * not category imagery — nine of them in a row said "buy" no matter where the
 * links went. Type carries the brand here without pretending to sell anything.
 *
 * Seit 02.10.2026 nur noch die Antworten auf Remys Frage „Worauf hast du
 * Lust?" (HubFragRemy; die Frage selbst steht dort). Zeigt man auf eine,
 * sagt Remy seinen Satz zu ihr — welchen, sagt `data-slug` (HubMotion,
 * `armRemySays`).
 */
export default function CategoriesRail({ categoryNames, locale }: Props) {
  const entries = Object.entries(categoryNames);
  if (!entries.length) return null;

  return (
    <ul
      className={styles.grid}
      role="list"
      aria-label={locale === 'en' ? 'Categories' : 'Kategorien'}
      data-hub-categories=""
    >
      {entries.map(([slug, name]) => (
        <li key={slug}>
          {/* Der Name steht als Text direkt in der Zeile: `.chip` ist ein
              Flex-Container, ein Textknoten darin ist ein anonymes
              Flex-Element und richtet sich genauso aus wie ein <span>. */}
          <Link
            href={`/kategorie/${slug}`}
            className={styles.chip}
            data-text={name}
            data-slug={slug}
          >
            {name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
