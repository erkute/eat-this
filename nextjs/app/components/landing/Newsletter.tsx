'use client';

import styles from './landing.module.css';

const STARBURST_POINTS =
  '50,0 57.41,12.73 69.13,3.81 71.12,18.41 85.36,14.64 81.59,28.88 96.19,30.87 87.27,42.59 ' +
  '100,50 87.27,57.41 96.19,69.13 81.59,71.12 85.36,85.36 71.12,81.59 69.13,96.19 57.41,87.27 ' +
  '50,100 42.59,87.27 30.87,96.19 28.88,81.59 14.64,85.36 18.41,71.12 3.81,69.13 12.73,57.41 ' +
  '0,50 12.73,42.59 3.81,30.87 18.41,28.88 14.64,14.64 28.88,18.41 30.87,3.81 42.59,12.73';

export default function Newsletter() {
  return (
    <section className={styles.news}>
      <div className={styles.newsInner}>
        <div className={styles.newsVisual}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/booster/booster3.webp"
            alt=""
            className={styles.newsPack}
            loading="lazy"
            decoding="async"
          />
          <div className={styles.newsBadge}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <polygon
                points={STARBURST_POINTS}
                fill="#f5c518"
                stroke="#1a1a1a"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span className={styles.newsBadgeText}>
              Vor
              <br />
              allen
            </span>
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
          <span className={styles.newsNote}>Kein Spam. Jederzeit kündbar.</span>
        </div>
      </div>
    </section>
  );
}
