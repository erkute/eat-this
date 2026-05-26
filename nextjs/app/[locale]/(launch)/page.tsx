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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pics/launch-coming-soon.webp?v=2"
        alt="Coming Soon"
        className={styles.kicker}
        width="1942"
        height="809"
        loading="eager"
        decoding="async"
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pics/launch-banner.webp?v=2"
        alt="Eat This"
        className={styles.brand}
        width="1035"
        height="975"
        loading="eager"
        decoding="async"
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pics/launch-tagline.webp?v=2"
        alt="we tell you what to eat."
        className={styles.tagline}
        width="1579"
        height="285"
        loading="eager"
        decoding="async"
      />

      {/* Drifting card-back — slow balloon-like background loop. Painted
          before .cat in source order so the cat layers on top where they
          overlap (z-index 0 keeps both behind the form/notifyTrigger). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pics/card-back.webp"
        alt=""
        aria-hidden="true"
        className={styles.floatCard}
        width="540"
        height="726"
        loading="lazy"
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

      <div className={styles.scrollHint} aria-hidden="true">
        <span className={styles.scrollHintArrow} />
      </div>

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
