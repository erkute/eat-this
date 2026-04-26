import styles from './landing.module.css';

export default function Intro() {
  return (
    <section className={styles.intro}>
      <span className={styles.secLabel}>Berlin · 150+ Must-Eats · 200+ Restaurants</span>
      <h1 className={styles.introHeadline}>
        Wahrscheinlich der beste Foodguide, den du kennst.
      </h1>
      <p className={styles.introSubtitle}>
        Die kuratierteste Sammlung der besten Berliner Restaurants. Karte für Karte.
      </p>
    </section>
  );
}
