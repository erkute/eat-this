import { normalizeName } from '@/lib/normalizeName';
import { Link } from '@/i18n/navigation';
import type { HubDistrict } from '@/lib/home/getHomeData';
import styles from './DistrictsList.module.css';

interface Props {
  districts: HubDistrict[];
  locale: 'de' | 'en';
}

export default function DistrictsList({ districts, locale }: Props) {
  if (!districts.length) return null;
  return (
    <section
      className="homeV2 hv-section hv-wrap"
      aria-label={locale === 'en' ? 'By district' : 'Nach Bezirk'}
    >
      <div className="hv-head">
        <h2 className={`hv-title ${styles.title}`}>
          <span className="hv-mk" aria-hidden="true" />
          {locale === 'en' ? 'By district' : 'Nach Bezirk'}
        </h2>
        <Link href="/bezirk" className={`hv-link ${styles.allLink}`}>
          {locale === 'en' ? 'All' : 'Alle'} →
        </Link>
      </div>
      <div className={styles.rows}>
        {districts.map((d) => (
          <Link
            key={d.slug}
            href={`/bezirk/${d.slug}`}
            className={styles.row}
          >
            <span className={styles.name}>{normalizeName(d.name)}</span>
            <span className="hv-sub">
              {d.count ?? 0} {locale === 'en' ? 'spots' : 'Spots'} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
