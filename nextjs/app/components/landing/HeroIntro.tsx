'use client';

import styles from './landing.module.css';

// Mobile-only intro under the hero image. Desktop renders the same
// content overlaid on the hero (.heroDesktopExtra in HeroSection).
export default function HeroIntro() {
  return (
    <section className={styles.heroIntro}>
      <span className={styles.heroIntroStats}>
        Berlin · 150+ Must Eats · 200+ Restaurants
      </span>
      <h1 className={styles.heroIntroHeadline}>
        Wahrscheinlich der beste Foodguide, den du kennst.
      </h1>
      <p className={styles.heroIntroSubtitle}>
        Eine kuratierte Sammlung der besten Berliner Restaurants.
      </p>
      <form
        className={styles.heroIntroForm}
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          className={styles.heroIntroInput}
          type="email"
          placeholder="deine@email.de"
          aria-label="E-Mail-Adresse"
        />
        <button className={styles.heroIntroSubmit} type="submit">
          Registriere dich
        </button>
      </form>
    </section>
  );
}
