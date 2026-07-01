'use client'

import { useTranslation } from '@/lib/i18n'
import { Link } from '@/i18n/navigation'
import styles from './SiteFooter.module.css'

export default function SiteFooter() {
  const { t, lang, setLang } = useTranslation()
  const de = lang === 'de'
  const follow = de ? 'Folgen' : 'Follow'
  const askRemy = de ? 'Frag Remy' : 'Ask Remy'

  return (
    <footer className={styles.footer} role="contentinfo" aria-label="Site footer">
      <div className={styles.top}>
        <div className={styles.brand}>
          <h2 className={styles.mega} aria-label="Eat This">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pics/eat-this-logo.webp?v=6"
              alt="Eat This"
              width="1660"
              height="667"
              loading="lazy"
              decoding="async"
              className={styles.megaImg}
            />
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/slogan.webp?v=3"
            alt="we tell you what to eat."
            width="1029"
            height="145"
            loading="lazy"
            decoding="async"
            className={styles.tagImg}
          />
        </div>

        <Link href="/#hub-fragremy" className={styles.remyLink}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/buddy/buddy-smile.webp" alt="" width="220" height="220" loading="lazy" decoding="async" />
          <span>{askRemy}</span>
        </Link>
      </div>

      <div className={styles.links}>
        <div className={styles.linksKicker}>{follow}</div>
        <a
          href="https://www.instagram.com/eatthisdotcom/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.socialLink}
        >
          Instagram
        </a>
        <div className={styles.lang} role="group" aria-label="Language / Sprache">
          <button
            type="button"
            className={`${styles.langBtn} ${lang === 'de' ? styles.langBtnActive : ''}`}
            onClick={() => setLang('de')}
            aria-label="Deutsch"
          >
            DE
          </button>
          <span className={styles.langSep}>·</span>
          <button
            type="button"
            className={`${styles.langBtn} ${lang === 'en' ? styles.langBtnActive : ''}`}
            onClick={() => setLang('en')}
            aria-label="English"
          >
            EN
          </button>
        </div>
      </div>

      <nav className={styles.legal} aria-label="Footer legal">
        <Link href="/impressum" className={styles.legalLink}>{t('footer.impressum')}</Link>
        <Link href="/datenschutz" className={styles.legalLink}>{t('footer.datenschutz')}</Link>
        <Link href="/agb" className={styles.legalLink}>{t('footer.agb')}</Link>
        <button
          type="button"
          className={`${styles.legalLink} ${styles.legalBtn}`}
          onClick={() => window.dispatchEvent(new Event('eatthis:open-cookie-settings'))}
        >
          {t('footer.cookieSettings')}
        </button>
      </nav>

      <div className={styles.meta}>
        <span className={styles.copy}>{t('footer.copyright')}</span>
      </div>
    </footer>
  )
}
