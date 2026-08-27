import { Link } from '@/i18n/navigation';
import styles from './HubSiblings.module.css';

export interface HubSibling {
  slug: string;
  label: string;
}

interface Props {
  /** Die Geschwister — der eigene Hub gehört vorher herausgefiltert. */
  items: HubSibling[];
  /** Pfad-Präfix des Hub-Typs, ohne Sprache: `/bezirk` oder `/kategorie`. */
  base: '/bezirk' | '/kategorie';
  heading: string;
  ariaLabel: string;
}

/**
 * Die Zeile mit den Nachbar-Hubs am Fuß einer Bezirks- oder Kategorieseite.
 *
 * Sie ersetzt die Brotkrume, und zwar nicht eins zu eins: die Krume zeigte eine
 * Ebene nach oben auf den Index — ein Ziel, das der Burger-Drawer auf jeder
 * Seite ohnehin trägt. Gemessen am 27.08.2026 führte von `/bezirk/prenzlauer-berg`
 * **kein einziger** Link zu einem anderen Bezirk: die Chip-Leiste darüber sieht
 * aus wie Navigation, filtert aber nur die eigene Liste. Die Seite war eine
 * Sackgasse. Diese Zeile beantwortet stattdessen die Frage, die Leute am Ende
 * einer Spot-Liste wirklich haben — „und wo noch?".
 *
 * Nebeneffekt, der die Hubs betrifft: sie bekommen damit die katalogweite
 * interne Verlinkung zurück, die mit der „Auch in:"-Leiste weggefallen ist.
 */
export default function HubSiblings({ items, base, heading, ariaLabel }: Props) {
  if (items.length === 0) return null;

  return (
    <nav className={styles.wrap} aria-label={ariaLabel}>
      <h2 className={styles.heading}>{heading}</h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.slug}>
            <Link href={`${base}/${item.slug}`} className={styles.link}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
