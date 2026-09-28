import styles from './HubMarquee.module.css';

interface Props {
  locale: 'de' | 'en';
}

/* Nur Begriffe, die die Seite ohnehin führt: der Claim, der Name der Karte,
   die Must Eats, der Spot des Tages. Das Band erklärt nichts, es setzt Ton. */
const WORDS = {
  de: ['Berlin Food Map', 'Must Eats', 'Spot des Tages', 'Hidden Gems'],
  en: ['Berlin Food Map', 'Must Eats', 'Spot of the day', 'Hidden Gems'],
} as const;

const CLAIM = 'We tell you what to eat';

function Run({ items }: { items: readonly string[] }) {
  return (
    <span className={styles.run}>
      {items.map((w, i) => (
        <span key={i} className={styles.word}>
          {w}
          <span className={styles.dot} />
        </span>
      ))}
    </span>
  );
}

/**
 * Zwei gekreuzte Bänder mit der Markenschrift zwischen Aufmacher und dem
 * ersten Abschnitt: gelb mit Claim, darunter der Rest als Kontur. Sie laufen
 * endlos (CSS, auf dem Compositor — kein Zittern beim Scrollen), ab 768px
 * schiebt HubMotion sie beim Scrollen zusätzlich gegeneinander.
 *
 * Reine Dekoration aus Wörtern, die gleich darunter richtig stehen: für
 * Screenreader weg. Jede Spur trägt ihren Lauf doppelt, damit die Schleife bei
 * -50 % nahtlos wieder anfängt.
 */
export default function HubMarquee({ locale }: Props) {
  const claim = [CLAIM, CLAIM, CLAIM];
  const words = WORDS[locale];
  return (
    <section className={styles.band} aria-hidden="true" data-hub-marquee="">
      <div className={`${styles.tape} ${styles.tapeAccent}`} data-marquee-row="1">
        <div className={styles.track}>
          <Run items={claim} />
          <Run items={claim} />
        </div>
      </div>
      <div className={`${styles.tape} ${styles.tapeOutline}`} data-marquee-row="-1">
        <div className={`${styles.track} ${styles.trackReverse}`}>
          <Run items={words} />
          <Run items={words} />
        </div>
      </div>
    </section>
  );
}
