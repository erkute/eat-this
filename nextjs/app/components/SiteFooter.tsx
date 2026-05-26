'use client'

import { useTranslation } from '@/lib/i18n'
import { Link } from '@/i18n/navigation'
import styles from './SiteFooter.module.css'

export default function SiteFooter() {
  const { t, lang, setLang } = useTranslation()
  const de = lang === 'de'
  const follow = de ? 'Folgen' : 'Follow'

  return (
    <footer className={styles.footer} role="contentinfo" aria-label="Site footer">
      <h2 className={styles.mega} aria-label="Eat This">
        Eat<br />This
      </h2>
      <div className={styles.tag}>We tell you what to eat</div>

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
        <a
          href="https://www.tiktok.com/@eatthis"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.socialLink}
        >
          TikTok
        </a>
      </div>

      <nav className={styles.legal} aria-label="Footer legal">
        <Link href="/impressum" className={styles.legalLink}>{t('footer.impressum')}</Link>
        <Link href="/datenschutz" className={styles.legalLink}>{t('footer.datenschutz')}</Link>
        <Link href="/agb" className={styles.legalLink}>{t('footer.agb')}</Link>
      </nav>

      <div className={styles.meta}>
        <span className={styles.copy}>{t('footer.copyright')}</span>
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
    </footer>
  )
}
