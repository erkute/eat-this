'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export default function BurgerDrawer() {
  const { t, lang, setLang } = useTranslation();
  return (
    <div className="burger-drawer" id="burgerDrawer">
      <div className="burger-drawer-backdrop" id="burgerBackdrop"></div>
      <div className="burger-drawer-panel">
        <button className="burger-drawer-close" id="burgerClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <nav className="burger-nav">
          <Link href="/about" className="burger-nav-item burger-nav-item--sm" id="openAbout">{t('burger.about')}</Link>
          <Link href="/contact" className="burger-nav-item burger-nav-item--sm" id="openContact">{t('burger.contact')}</Link>
          <Link href="/press" className="burger-nav-item burger-nav-item--sm" id="openPress">{t('burger.press')}</Link>
          <Link href="/impressum" className="burger-nav-item burger-nav-item--sm" id="openImpressum">{t('burger.impressum')}</Link>
        </nav>
        <div className="burger-utils">
          <button className="burger-util-btn" id="burgerSearchTrigger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span>{t('search.placeholder')}</span>
          </button>
          <a
            href="https://www.instagram.com/eatthisdotcom/"
            target="_blank"
            rel="noopener noreferrer"
            className="burger-util-btn burger-util-link"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5"/>
              <circle cx="12" cy="12" r="5"/>
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
            Instagram
          </a>
          <button className="burger-util-btn" id="loginBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{t('footer.signIn')}</span>
          </button>
        </div>
        <div className="burger-theme-row">
          <button type="button" className="theme-toggle" id="themeToggleBurger" aria-label="Toggle dark mode" suppressHydrationWarning>
            <span className="theme-toggle-track">
              <span className="theme-toggle-thumb"></span>
            </span>
            <span className="theme-toggle-label">{t('theme.darkMode')}</span>
          </button>
        </div>
        <div className="burger-lang-row">
          <div className="lang-switcher" id="langSwitcher" role="group" aria-label="Language / Sprache">
            <button
              className={`lang-btn${lang === 'en' ? ' active' : ''}`}
              data-lang="en"
              aria-label="English"
              onClick={() => setLang('en')}
              suppressHydrationWarning
            >
              EN
            </button>
            <button
              className={`lang-btn${lang === 'de' ? ' active' : ''}`}
              data-lang="de"
              aria-label="Deutsch"
              onClick={() => setLang('de')}
              suppressHydrationWarning
            >
              DE
            </button>
          </div>
        </div>
        <div className="burger-drawer-footer">
          <Link
            href="/datenschutz"
            className="burger-drawer-footer-btn"
            id="openDatenschutzFromBurger"
          >
            {t('modals.datenschutz.title')}
          </Link>
          <span>·</span>
          <Link
            href="/agb"
            className="burger-drawer-footer-btn"
            id="openAgbFromBurger"
          >
            {t('modals.agb.title')}
          </Link>
        </div>
      </div>
    </div>
  );
}
