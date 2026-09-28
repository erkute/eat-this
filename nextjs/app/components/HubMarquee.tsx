import styles from './HubMarquee.module.css';

const CLAIM = 'We tell you what to eat';

/**
 * Das gelbe Band mit dem Claim zwischen Aufmacher und erstem Abschnitt, schräg
 * über die volle Breite. Es läuft endlos (CSS, auf dem Compositor — kein
 * Zittern beim Scrollen), ab 768px schiebt HubMotion es beim Scrollen
 * zusätzlich weiter. Ein zweites Band mit weiteren Begriffen darunter ist
 * wieder raus (Ansage 28.09.2026): nur der Claim.
 *
 * Reine Deko aus dem Claim, der oben schon als Headline steht: für
 * Screenreader weg. Die Spur trägt ihren Lauf doppelt, damit die Schleife bei
 * -50 % nahtlos wieder anfängt.
 */
export default function HubMarquee() {
  const run = (
    <span className={styles.run}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={styles.word}>
          {CLAIM}
          <span className={styles.dot} />
        </span>
      ))}
    </span>
  );
  return (
    <section className={styles.band} aria-hidden="true" data-hub-marquee="">
      <div className={styles.tape} data-marquee-row="1">
        <div className={styles.track}>
          {run}
          {run}
        </div>
      </div>
    </section>
  );
}
