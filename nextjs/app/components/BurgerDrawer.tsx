'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';
import { routing } from '@/i18n/routing';
import LocaleLink from './LocaleLink';

export default function BurgerDrawer() {
  const { t, lang, setLang } = useTranslation();
  const { user } = useAuth();
  const locale = useLocale();
  const { isDark, toggleTheme } = useTheme();

  const handleLoginBtn = useCallback(() => {
    document.getElementById('burgerDrawer')?.classList.remove('active');
    document.body.style.overflow = '';
    if (user) {
      const href = locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`;
      window.location.assign(href);
    } else {
      window.openLoginModal?.();
    }
  }, [user, locale]);
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
          <LocaleLink href="/about" className="burger-nav-item burger-nav-item--sm" id="openAbout">{t('burger.about')}</LocaleLink>
          <LocaleLink href="/contact" className="burger-nav-item burger-nav-item--sm" id="openContact">{t('burger.contact')}</LocaleLink>
          <LocaleLink href="/press" className="burger-nav-item burger-nav-item--sm" id="openPress">{t('burger.press')}</LocaleLink>
          <LocaleLink href="/impressum" className="burger-nav-item burger-nav-item--sm" id="openImpressum">{t('burger.impressum')}</LocaleLink>
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
          {/* Pre-hydration bootstrap in layout.tsx may set .logged-in + username
              from the _authHint localStorage snapshot, so suppress hydration
              warnings on this button and its label span. */}
          <button className="burger-util-btn" id="loginBtn" onClick={handleLoginBtn} suppressHydrationWarning>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span suppressHydrationWarning>{t('footer.signIn')}</span>
          </button>
        </div>
        <div className="burger-theme-row">
          <button type="button" className="theme-toggle" aria-label="Toggle dark mode" aria-pressed={isDark} onClick={toggleTheme} suppressHydrationWarning>
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
          <LocaleLink
            href="/datenschutz"
            className="burger-drawer-footer-btn"
            id="openDatenschutzFromBurger"
          >
            {t('modals.datenschutz.title')}
          </LocaleLink>
          <span>·</span>
          <LocaleLink
            href="/agb"
            className="burger-drawer-footer-btn"
            id="openAgbFromBurger"
          >
            {t('modals.agb.title')}
          </LocaleLink>
        </div>
      </div>
    </div>
  );
}
