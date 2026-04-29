import Link from 'next/link';
import styles from '../not-found.module.css';

interface NotFoundContentProps {
  /** Locale prefix for the home link (e.g. "" for German, "/en" for English). */
  homeHref?: string;
}

export default function NotFoundContent({ homeHref = '/' }: NotFoundContentProps) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.code}>404 · NICHT GEFUNDEN</span>

        <div className={styles.crew} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/email/char1.png" alt="" width={80} height={110} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/email/char2.png" alt="" width={80} height={110} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/email/char3.png" alt="" width={80} height={110} />
        </div>

        <h1 className={styles.title}>Hier gibt’s nichts zu essen.</h1>

        <p className={styles.sub}>
          Diese Seite haben wir nicht auf der Karte. Schau dich auf der
          Startseite um — die Booster Packs warten.
        </p>

        <Link href={homeHref} className={styles.cta}>
          Zur Startseite
        </Link>

        <p className={styles.muted}>
          Tisch reservieren? Lieber doch nicht.
        </p>
      </section>
    </main>
  );
}
