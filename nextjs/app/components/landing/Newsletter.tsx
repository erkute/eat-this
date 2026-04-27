'use client';
import styles from './landing.module.css';

export default function Newsletter() {
  return (
    <section className={styles.news}>
      <span className={styles.secLabel}>Newsletter</span>
      <h2>Bleib am Tisch.</h2>
      <p>Neue Must-Eats, neue Städte, neue Decks — direkt in dein Postfach.</p>
      <form className={styles.newsForm} onSubmit={(e) => e.preventDefault()}>
        <input
          className={styles.newsInput}
          type="email"
          placeholder="deine@email.de"
          aria-label="E-Mail-Adresse"
        />
        <button className={styles.newsBtn} type="submit">
          Abonnieren
        </button>
      </form>
    </section>
  );
}
