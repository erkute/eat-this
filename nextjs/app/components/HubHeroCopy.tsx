import MapIntentLink from './MapIntentLink';
import styles from './HubSection.module.css';

interface Props { locale: 'de' | 'en' }
const ART = '/pics/home/silver-hero';

/** One server-rendered hero for guests and members, independent of auth hydration. */
export default function HubHeroCopy({ locale }: Props) {
  return (
    <div className={styles.heroCopy}>
      <div className={styles.heroBrand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.heroMark} data-hero-mark="" src={`${ART}/wordmark.webp`} width={2172} height={724} alt="Eat This" fetchPriority="high" decoding="async" />
      </div>
      <h1 className={styles.heroHeadline}>
        <span className={styles.heroAccessible}>We tell you what to eat</span>
        <span className={styles.heroSloganDesktop} aria-hidden="true">
          <span className={styles.heroSloganFirst}><span /></span>
          <span className={styles.heroSloganSecond}><span /></span>
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.heroSloganMobile} src={`${ART}/slogan-mobile.webp`} width={2172} height={724} alt="" aria-hidden="true" />
      </h1>
      <MapIntentLink href="/must-eats" className={styles.heroArt} aria-label={locale === 'de' ? 'Must Eats entdecken' : 'Discover Must Eats'}>
        <span className={styles.heroFan}>
        {/* eslint-disable @next/next/no-img-element */}
        <img className={styles.heroCardLeft} src={`${ART}/sausage.webp`} width={1026} height={1410} alt="Spicy Thai Sausage · Bar Basta" fetchPriority="high" decoding="async" />
        <img className={styles.heroCardRight} src={`${ART}/sabich.webp`} width={1026} height={1410} alt="Sabich · Kitten Deli" fetchPriority="high" decoding="async" />
        <img className={styles.heroCardFront} src={`${ART}/fish.webp`} width={513} height={705} alt="Kinmedai Sashimi · November Brasserie" fetchPriority="high" decoding="async" />
        {/* eslint-enable @next/next/no-img-element */}
        </span>
      </MapIntentLink>
      <div className={styles.heroActions} data-hero-actions="">
        <MapIntentLink href="/must-eats" className="et-btn et-btn-lg et-btn-editorial">
          {locale === 'de' ? 'Must Eats entdecken' : 'Discover Must Eats'}
        </MapIntentLink>
      </div>
    </div>
  );
}
