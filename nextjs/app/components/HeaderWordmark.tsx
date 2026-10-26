import styles from './HeaderWordmark.module.css';

/** Map/Menü lettered like the logo; sources and sizing in the CSS module. */
export default function HeaderWordmark({ word, locale = 'de' }: {
  word: 'map' | 'menu';
  locale?: string;
}) {
  return <span
    aria-hidden="true"
    className={`${styles.wordmark} ${word === 'map' ? styles.map : locale === 'en' ? styles.menuEn : styles.menu}`}
  />;
}
