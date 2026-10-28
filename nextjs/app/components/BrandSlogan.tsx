import styles from './BrandSlogan.module.css';

/** Approved live lettering, sentence case; shared by the hero and footer. */
export default function BrandSlogan() {
  return <span className={styles.slogan} aria-hidden="true" />;
}
