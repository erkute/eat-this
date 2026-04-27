'use client';

import styles from './landing.module.css';

export default function Newsletter() {
  return (
    <section className={styles.news}>
      <div className={styles.newsInner}>
        <div className={styles.newsVisual}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/booster/booster1.webp"
            alt=""
            className={styles.newsPack}
            loading="lazy"
            decoding="async"
          />
          <div className={styles.newsBadge}>
            <span className={styles.newsBadgeText}>Bon Appetit</span>
          </div>
        </div>
        <div className={styles.newsCopy}>
          <span className={styles.secLabel}>Newsletter</span>
          <h2>Sei zuerst dran.</h2>
          <p>
            Neue Must-Eats, neue Städte, neue Decks — direkt in dein Postfach,
            bevor wir öffentlich davon erzählen.
          </p>
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
          <span className={styles.newsNote}>Frisch aus der Küche.</span>
        </div>
      </div>
    </section>
  );
}
