import DiscoveryMap from './DiscoveryMap';
import styles from './DiscoveryExplorer.module.css';

export interface DiscoveryEntry {
  slug: string;
  name: string;
  href: string;
}

export default function DiscoveryExplorer({ entries, locale }: {
  entries: DiscoveryEntry[];
  locale: 'de' | 'en';
}) {
  const de = locale === 'de';
  return (
    <section className={styles.explorer} aria-labelledby="discovery-title" data-discovery="bezirk">
      <h1 className={styles.accessibleTitle} id="discovery-title">Berlin</h1>
      <DiscoveryMap entries={entries} de={de} />
    </section>
  );
}
