import styles from './HeaderWordmark.module.css';

/** The navigation lettering follows the raster brand study from Figma. */
export default function HeaderWordmark({ word, locale = 'de' }: {
  word: 'map' | 'menu';
  locale?: string;
}) {
  return <span
    aria-hidden="true"
    className={`${styles.wordmark} ${word === 'map' ? styles.map : locale === 'en' ? styles.menuEn : styles.menu}`}
  />;
}
