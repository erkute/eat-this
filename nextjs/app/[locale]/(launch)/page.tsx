import { setRequestLocale } from 'next-intl/server'
import { Link, redirect } from '@/i18n/navigation'
import LaunchClient from './LaunchClient'
import styles from './launch.module.css'
import { isStaging } from '@/lib/env'

export default async function LaunchPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale: 'de' | 'en' = rawLocale === 'en' ? 'en' : 'de'

  // Staging: bypass the launch holding page entirely. Operator wants to
  // dogfood the real app at `/` — `/map` is the SPA's actual entry.
  if (isStaging) {
    redirect({ href: '/map', locale })
  }

  setRequestLocale(rawLocale)

  return (
    <div className={styles.page} data-launch-page="">
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

      {/* Cat-eats-sandwich hero. Frameless full bleed — video bg blends
          into the page on the lighter top half; bottom shows the cat
          sitting on its table as a soft rectangle on cream paper. */}
      <video
        className={styles.video}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/pics/launch-cat-poster.webp"
        width="540"
        height="960"
        aria-hidden="true"
      >
        <source src="/videos/launch-cat.mp4" type="video/mp4" />
      </video>

      <LaunchClient locale={locale} />

      <div className={styles.foot}>
        <div className={styles.footLinks}>
          <Link href="/impressum">Impressum</Link>
          <span className={styles.sep}>·</span>
          <Link href="/datenschutz">Datenschutz</Link>
          <span className={styles.sep}>·</span>
          <Link href="/agb">AGB</Link>
        </div>
        <span className={styles.copyright}>© 2026 Eat This</span>
        {/* reCAPTCHA disclosure — Google's ToS lets us hide the badge
            (which would otherwise eat the bottom-right corner) as long
            as the branding text is shown inline somewhere on the page. */}
        <span className={styles.recaptchaNote}>
          {locale === 'de' ? 'Geschützt durch reCAPTCHA · ' : 'Protected by reCAPTCHA · '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            {locale === 'de' ? 'Datenschutz' : 'Privacy'}
          </a>
          {' · '}
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
            {locale === 'de' ? 'Nutzungsbedingungen' : 'Terms'}
          </a>
        </span>
      </div>
    </div>
  )
}
