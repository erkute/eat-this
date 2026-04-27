import styles from './landing.module.css';

export default function Coming() {
  return (
    <section className={styles.coming}>
      <span className={styles.secLabel}>Was kommt</span>
      <h2>Berlin ist erst der Anfang.</h2>
      <p>
        Wir expandieren Stadt für Stadt. Istanbul, Amsterdam und Tokio sind in Vorbereitung —
        mehr Decks, mehr Must Eats und exklusives Merch.
      </p>
    </section>
  );
}
