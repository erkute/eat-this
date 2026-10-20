import { Link } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import styles from './HomeDistricts.module.css';

const districts = [['mitte','Mitte'], ['kreuzberg','Kreuzberg'], ['neukoelln','Neukölln'], ['wedding','Wedding'], ['schoeneberg','Schöneberg'], ['prenzlauer-berg','Prenzlauer Berg'], ['charlottenburg','Charlottenburg'], ['friedrichshain','Friedrichshain']];
export default function HomeDistricts({ locale }: { locale: 'de' | 'en' }) {
  return (
    <section className={styles.section} aria-label={locale === 'de' ? 'Berlin entdecken' : 'Explore Berlin'}>
      <div className={styles.map}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pics/home/berlin.svg" width={590} height={590} alt={locale === 'de' ? 'Die Berliner Bezirke, Mitte in Rot' : 'Berlin districts, Mitte highlighted in red'} loading="lazy" />
      </div>
      <div className={styles.content}>
        <div className={styles.large}>{districts.slice(0,4).map(([slug,name]) => <Link key={slug} href={`/bezirk/${slug}`}>{name}</Link>)}</div>
        <div className={styles.small}>{districts.slice(4).map(([slug,name]) => <Link key={slug} href={`/bezirk/${slug}`}>{name}</Link>)}</div>
        <MapIntentLink href="/map" className="hv-btn">{locale === 'de' ? 'Map entdecken' : 'Explore the map'}</MapIntentLink>
      </div>
    </section>
  );
}
