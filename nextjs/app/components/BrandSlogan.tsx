import styles from './BrandSlogan.module.css';

/** The hero artwork arranged on one line, also used in the footer. */
export default function BrandSlogan() {
  return (
    <span className={styles.slogan} aria-hidden="true">
      <span className={styles.first}><span /></span>
      <span className={styles.second}><span /></span>
    </span>
  );
}
