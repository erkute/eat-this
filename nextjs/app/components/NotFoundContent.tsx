import Link from 'next/link'
import styles from '../not-found.module.css'

interface NotFoundContentProps {
  /** Locale prefix for the home link. "/" routes back to the DE home hub;
   *  pass "/en" if you can resolve the user's locale upstream. */
  homeHref?: string
}

export default function NotFoundContent({ homeHref = '/' }: NotFoundContentProps) {
  return (
    <main className={styles.page} data-page="not-found">
      <p className={styles.kicker}>EAT THIS · 404</p>

      <h1 className={styles.code} aria-label="404">404</h1>

      <p className={styles.headline}>
        Steht nicht auf der Karte.
      </p>

      <p className={styles.sub}>
        Falscher Link oder alte Adresse — diese Seite gibt es nicht.
        <br />
        Auf der Startseite liegt die ganze Map.
      </p>

      <Link href={homeHref} className={styles.cta}>
        Zur Startseite →
      </Link>
    </main>
  )
}
