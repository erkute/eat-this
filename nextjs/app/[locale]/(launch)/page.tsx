import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import LaunchClient from './LaunchClient'
import styles from './launch.module.css'

export default async function LaunchPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale: 'de' | 'en' = rawLocale === 'en' ? 'en' : 'de'
  setRequestLocale(rawLocale)

  return (
    <div className={styles.page} data-launch-page="">
      <span className={styles.kicker}>
        <span className={styles.kickerTag}>Berlin</span>
        <span className={styles.kickerLoc}>Coming Soon</span>
      </span>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pics/launch-banner.webp"
        alt="Eat This — we tell you what to eat"
        className={styles.brand}
        width="1846"
        height="884"
        loading="eager"
        decoding="async"
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pics/launch-cat.webp"
        alt=""
        aria-hidden="true"
        className={styles.cat}
        width="1145"
        height="1408"
        loading="eager"
        decoding="async"
      />

      <p className={styles.sub}>
        <span className={styles.subLeft}>
          <span className={styles.coral}>The Map</span> for people<span className={styles.commaMobile}>,</span>
        </span>{' '}
        <span className={styles.subRight}>who care about food.</span>
      </p>

      <LaunchClient locale={locale} />

      <div className={styles.foot}>
        <Link href="/impressum">Impressum</Link>
        <span className={styles.sep}>·</span>
        <Link href="/datenschutz">Datenschutz</Link>
        <span className={styles.sep}>·</span>
        <Link href="/agb">AGB</Link>
        <span className={styles.sep}>·</span>
        <span>© 2026 Eat This</span>
      </div>
    </div>
  )
}
