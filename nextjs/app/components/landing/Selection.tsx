import styles from './landing.module.css';

export default function Selection() {
  return (
    <section className={styles.selection}>
      <span className={styles.secLabel}>Wie wir auswählen</span>
      <h2 className={styles.selectionHeadline}>Nur das Beste kommt ins Deck.</h2>
      <p className={styles.selectionBody}>
        Wir besuchen jeden Ort selbst und sprechen mit den Köchen, um die Gerichte zu finden,
        die wirklich herausragen.
      </p>
    </section>
  );
}
