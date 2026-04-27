'use client';

import styles from './landing.module.css';

export default function HeroForm() {
  return (
    <form className={styles.heroForm} onSubmit={(e) => e.preventDefault()}>
      <input
        className={styles.heroInput}
        type="email"
        placeholder="deine@email.de"
        aria-label="E-Mail-Adresse"
      />
      <button className={styles.heroSubmit} type="submit">
        Kostenlos starten
      </button>
    </form>
  );
}
