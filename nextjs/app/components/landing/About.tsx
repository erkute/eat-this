import styles from './landing.module.css';

export default function About() {
  return (
    <section className={styles.about}>
      <span className={styles.secLabel}>Das Konzept</span>
      <h2 className={styles.aboutHeadline}>Bestell genau das.</h2>
      <p className={styles.aboutBody}>
        Wir spüren herausragende Gerichte auf. Jede Must-Eat-Karte in deiner Sammlung
        steht für eine Empfehlung, hinter der wir stehen.
      </p>
    </section>
  );
}
