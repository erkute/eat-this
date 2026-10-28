import Image from './SiteImage';
import PhoneDisplay from './PhoneDisplay';
import phoneStyles from './PhoneDisplay.module.css';
import styles from './MapPhoneArtwork.module.css';

/** Same iPhone casing as the home preview, with the current map spot list. */
export default function MapPhoneArtwork({ alt, className = '', fit = false }: { alt: string; className?: string; fit?: boolean }) {
  return (
    <div className={`${styles.mount} ${fit ? styles.fit : ''} ${className}`}>
      <div className={phoneStyles.phone}>
        <PhoneDisplay>
          <div className={styles.viewport}>
            <Image src="/pics/home-map/iphone-screen-4.webp" alt={alt} width={440} height={894} sizes="(max-width: 600px) 260px, 350px" className={styles.image} />
          </div>
        </PhoneDisplay>
      </div>
    </div>
  );
}
