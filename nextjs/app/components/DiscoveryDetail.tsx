import { Link } from '@/i18n/navigation';
import type { CSSProperties } from 'react';
import { categoryArt } from '@/lib/categoryArt';
import Image from './SiteImage';
import styles from './DiscoveryDetail.module.css';

/** Category heading, pack artwork and editorial description. */
export default function DiscoveryDetail({
  slug,
  name,
  description,
  updated,
  locale,
}: {
  slug: string;
  name: string;
  description: string;
  updated: string;
  locale: 'de' | 'en';
}) {
  const de = locale === 'de';
  const packArt = categoryArt(slug);
  return (
    <header className={`${styles.header} ${styles.category} ${packArt ? styles.withPack : ''}`}>
      <Link className={styles.back} href="/kategorie">
        {de ? 'Alle Kategorien' : 'All categories'}
      </Link>
      <div className={styles.head}>
        <h1 className={styles.title} style={{ '--title-fit': `${100 / (name.length * 0.85)}cqi` } as CSSProperties}>
          {name}
          <span> in Berlin</span>
        </h1>
      </div>
      {packArt && (
        <div className={styles.categoryPack} data-category-pack={slug} aria-hidden="true">
          <Image src={packArt} alt="" width={240} height={360}
            sizes="(max-width: 767px) 96px, 140px" priority />
        </div>
      )}
      <div className={styles.copy}>
        {description && <p className={styles.description}>{description}</p>}
        {updated && (
          <p className={styles.updated}>{de ? `Stand ${updated}` : `Updated ${updated}`}</p>
        )}
      </div>
    </header>
  );
}
