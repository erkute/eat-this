'use client';
import styles from './landing.module.css';

const STARBURST_POINTS =
  '50,0 57.41,12.73 69.13,3.81 71.12,18.41 85.36,14.64 81.59,28.88 96.19,30.87 87.27,42.59 ' +
  '100,50 87.27,57.41 96.19,69.13 81.59,71.12 85.36,85.36 71.12,81.59 69.13,96.19 57.41,87.27 ' +
  '50,100 42.59,87.27 30.87,96.19 28.88,81.59 14.64,85.36 18.41,71.12 3.81,69.13 12.73,57.41 ' +
  '0,50 12.73,42.59 3.81,30.87 18.41,28.88 14.64,14.64 28.88,18.41 30.87,3.81 42.59,12.73';

export default function BoosterPack() {
  return (
    <section className={styles.pack}>
      <div className={styles.packStageWrap}>
        <span className={styles.secLabel}>Booster Pack</span>
        <h2 className={styles.packHeadline}>
          Sammle Berlins<br />beste Gerichte.
        </h2>
        <div className={styles.packStage}>
          <div className={`${styles.packCard} ${styles.bc1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/booster/booster5.webp" alt="" />
          </div>
          <div className={`${styles.packCard} ${styles.bc2}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/booster/booster2.webp" alt="" />
          </div>
          <div className={`${styles.packCard} ${styles.bc3}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/booster/booster3.webp" alt="" />
          </div>
        </div>
      </div>
      <div className={styles.packBody}>
        <p className={styles.packCopy}>
          Registriere dich und schalte dein erstes Booster Pack frei. Sammle die Karten,
          erkunde die Map und meistere die Berliner Food-Szene.
        </p>
        <ul className={styles.packBenefits}>
          <li>Zugriff auf die komplette Berlin-Map</li>
          <li>Dein persönliches Deck — gespeichert</li>
          <li>Sammle alle 150+ Must-Eats</li>
        </ul>
        <div className={styles.tenBadge}>
          <div className={styles.starburst}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <polygon
                points={STARBURST_POINTS}
                fill="#f5c518"
                stroke="#1a1a1a"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <div className={styles.starburstText}>
              <span className={styles.starburstNum}>10</span>
              <span className={styles.starburstLabel}>
                Must-Eat
                <br />
                Karten
              </span>
            </div>
          </div>
          <span className={styles.tenBadgeText}>
            Sofort freigeschaltet
            <br />
            nach Anmeldung
          </span>
        </div>
        <form className={styles.packEmail} onSubmit={(e) => e.preventDefault()}>
          <input
            className={styles.packInput}
            type="email"
            placeholder="deine@email.de"
            aria-label="E-Mail-Adresse"
          />
          <button className={styles.packSubmit} type="submit">
            Booster Pack sichern — kostenlos
          </button>
        </form>
      </div>
    </section>
  );
}
