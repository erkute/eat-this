import Image from './SiteImage';
import styles from './MapPhoneArtwork.module.css';

/** The current map screenshot, including the avatar, inside its exported iPhone frame. */
export default function MapPhoneArtwork({ alt, className = '', fit = false }: { alt: string; className?: string; fit?: boolean }) {
  return (
    <span className={`${styles.mount} ${fit ? styles.fit : ''} ${className}`}>
      <span className={styles.frame}>
      <Image src="/pics/home-map/phone-1.webp" alt={alt} width={534} height={1044} sizes="(max-width: 600px) 225px, 350px" className={styles.image} />
      </span>
    </span>
  );
}
