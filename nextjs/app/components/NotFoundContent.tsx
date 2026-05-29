import Link from 'next/link'
import styles from '../not-found.module.css'

interface NotFoundContentProps {
  /** Locale prefix for the home link. "/" routes back to the DE launch
   *  surface; pass "/en" if you can resolve the user's locale upstream. */
  homeHref?: string
}

export default function NotFoundContent({ homeHref = '/' }: NotFoundContentProps) {
  return (
    <main className={styles.page} data-page="not-found">
      {/* Drifting card-back — same background actor as the launch page so the
          404 reads as part of the same brand surface, not a generic Next
          fallback. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pics/card-back.webp?v=4"
        alt=""
        aria-hidden="true"
        className={styles.floatCard}
        width="540"
        height="726"
        loading="lazy"
        decoding="async"
      />

      <p className={styles.kicker}>EAT THIS · 404</p>

      <h1 className={styles.code} aria-label="404">404</h1>

      <p className={styles.headline}>
        diese seite ist leider verbrannt.
      </p>

      <p className={styles.sub}>
        Nicht auf der Karte. Probably nie existiert.
        <br />
        Schau auf der Startseite vorbei — da wartet die echte Map.
      </p>

      <Link href={homeHref} className={styles.cta}>
        Zur Startseite →
      </Link>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pics/launch-cat.webp"
        alt=""
        aria-hidden="true"
        className={styles.cat}
        width="1145"
        height="1408"
        loading="lazy"
        decoding="async"
      />
    </main>
  )
}
