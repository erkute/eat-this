import type { CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import geography from '@/lib/berlin-discovery-map.json';
import DiscoveryMotion from './DiscoveryMotion';
import styles from './DistrictHeader.module.css';

export default function DistrictHeader({ slug, name, description, locale }: {
  slug: string;
  name: string;
  description: string;
  locale: 'de' | 'en';
}) {
  const de = locale === 'de';
  const area = geography.regions.find(region => region.spotSlugs.includes(slug));
  // The source polygons contain absolute M/L pairs only. Fit the very same
  // geographic outline used by the overview, including on a direct visit.
  const points = area ? Array.from(area.path.matchAll(/[ML]([\d.-]+),([\d.-]+)/g),
    point => [Number(point[1]), Number(point[2])]) : [];
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const width = Math.max(...xs) - minX, height = Math.max(...ys) - minY;
  const pad = Math.max(width, height) * .08;

  return <header className={styles.header} data-district-header>
    <DiscoveryMotion />
    <Link className={styles.back} href="/bezirk" aria-label={de ? 'Zur Berlin-Karte' : 'Back to the Berlin map'}>Berlin</Link>
    <div className={styles.hero}>
      <div className={styles.heading}>
        <h1 className={styles.title} style={{ '--title-fit': `${100 / (name.length * 0.68)}cqi` } as CSSProperties}>{name}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {area && <svg className={styles.outline} data-district-outline={slug}
        viewBox={`${minX - pad} ${minY - pad} ${width + pad * 2} ${height + pad * 2}`}
        role="img" aria-label={de ? `Umriss von ${name}` : `Outline of ${name}`}>
        <path d={area.path} fillRule="evenodd" vectorEffect="non-scaling-stroke" />
      </svg>}
    </div>
  </header>;
}
