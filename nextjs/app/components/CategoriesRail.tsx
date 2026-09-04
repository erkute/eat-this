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
 */
export default function CategoriesRail({ categoryNames, locale }: Props) {
  const entries = Object.entries(categoryNames);
  if (!entries.length) return null;

  return (
    <section
      className="homeV2 hv-section hv-wrap"
      aria-label={locale === 'en' ? 'Categories' : 'Kategorien'}
    >
      <div className={styles.board}>
        <div className="hv-head">
          <h2 className="hv-title">
            <span className="hv-mk" aria-hidden="true" />
            {locale === 'en' ? 'What are you craving?' : 'Worauf hast du Lust?'}
          </h2>
        </div>
        <ul className={styles.grid} role="list">
          {entries.map(([slug, name]) => (
            <li key={slug}>
              {/* Der Name steht als Text direkt in der Zeile: `.chip` ist ein
                  Flex-Container, ein Textknoten darin ist ein anonymes
                  Flex-Element und richtet sich genauso aus wie ein <span>.
                  Der <span> hier trug `styles.chipLabel` — eine Klasse, die es
                  in CategoriesRail.module.css nie gab. */}
              <Link href={`/kategorie/${slug}`} className={styles.chip}>
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
