import { normalizeName } from '@/lib/normalizeName';
import MapIntentLink from './MapIntentLink';
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
        <h2 className="hv-title">
          <span className="hv-mk" aria-hidden="true" />
          {locale === 'en' ? 'By district' : 'Nach Bezirk'}
        </h2>
        <span className="hv-link">{locale === 'en' ? 'All' : 'Alle'} →</span>
      </div>
      <div className={styles.rows}>
        {districts.map((d) => (
          <MapIntentLink
            key={d.slug}
            href={`/map?bezirk=${d.slug}`}
            rel="nofollow"
            className={styles.row}
          >
            <span className={styles.name}>{normalizeName(d.name)}</span>
            <span className="hv-sub">
              {d.spots?.length ?? 0} {locale === 'en' ? 'spots' : 'Spots'} →
            </span>
          </MapIntentLink>
        ))}
      </div>
    </section>
  );
}
