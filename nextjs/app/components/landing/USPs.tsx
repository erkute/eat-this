import styles from './landing.module.css';

const USPS = [
  {
    num: '01',
    title: 'Reine Kuration',
    body: 'Eine Regel: nur das beste Essen. Wir besuchen, wir kosten, wir wählen aus.',
  },
  {
    num: '02',
    title: 'Das Deck',
    body:
      'Über 150 Must Eats in mehr als 200 Berliner Restaurants. Sammle die Karten, vervollständige dein Deck und kenne Berlin wie kein anderer.',
  },
  {
    num: '03',
    title: 'Erkunde die Karte',
    body: 'Entdecke die Stadt Gericht für Gericht.',
  },
];

export default function USPs() {
  return (
    <section className={styles.usps}>
      {USPS.map((u) => (
        <div key={u.num} className={styles.usp}>
          <div className={styles.uspNum}>{u.num}</div>
          <div className={styles.uspBody}>
            <h3>{u.title}</h3>
            <p>{u.body}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
