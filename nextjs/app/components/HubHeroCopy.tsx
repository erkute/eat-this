import MapIntentLink from './MapIntentLink';
import styles from './HubSection.module.css';
import BrandSlogan from './BrandSlogan';
import { BRAND_WORDMARK } from '@/lib/constants';

interface Props { locale: 'de' | 'en' }
const ART = '/pics/home/silver-hero';

/** One server-rendered hero for guests and members, independent of auth hydration. */
export default function HubHeroCopy({ locale }: Props) {
  return (
    <div className={styles.heroCopy}>
      <div className={styles.heroBrand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.heroMark} data-hero-mark="" src={BRAND_WORDMARK.src} width={2600} height={645} alt="Eat This" fetchPriority="high" decoding="async" />
      </div>
      <h1 className={styles.heroHeadline}>
        <span className={styles.heroAccessible}>We tell you what to eat</span>
        <span className={styles.heroSloganDesktop} aria-hidden="true">
          <BrandSlogan />
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.heroSloganMobile} src={`${ART}/slogan-mobile.webp`} width={1200} height={468} alt="" aria-hidden="true" />
      </h1>
      <MapIntentLink href="/must-eats" className={styles.heroArt} aria-label={locale === 'de' ? 'Must Eats entdecken' : 'Discover Must Eats'}>
        <span className={styles.heroFan}>
        {/* eslint-disable @next/next/no-img-element */}
        {[
          [styles.heroCardLeft, 'sausage.webp', 'Spicy Thai Sausage · Bar Basta'],
          [styles.heroCardRight, 'sabich.webp', 'Sabich · Kitten Deli'],
          [styles.heroCardFront, 'fish.webp', 'Kinmedai Sashimi · November Brasserie'],
        ].map(([position, file, alt]) => (
          <span key={file} className={`${styles.heroCard} ${position}`}>
            <span className={styles.heroCardFlip}>
              <img src={`${ART}/${file}`} width={1026} height={1410} alt={alt} fetchPriority="high" decoding="async" />
              <img className={styles.heroCardBack} src="/pics/card-back.webp?v=8" width={1026} height={1410} alt="" aria-hidden="true" fetchPriority="high" decoding="async" />
            </span>
          </span>
        ))}
        {/* eslint-enable @next/next/no-img-element */}
        </span>
      </MapIntentLink>
      <div className={styles.heroActions} data-hero-actions="">
        <MapIntentLink href="/must-eats" className="et-btn et-btn-lg">
          {locale === 'de' ? 'Must Eats entdecken' : 'Discover Must Eats'}
        </MapIntentLink>
      </div>
    </div>
  );
}
