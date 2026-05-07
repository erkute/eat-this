'use client';

import { useCallback, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { useAuth, openLoginModal } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';
import { routing } from '@/i18n/routing';
import { Link, usePathname } from '@/i18n/navigation';

export default function BurgerDrawer() {
  const { t, lang, setLang } = useTranslation();
  const { user } = useAuth();
  const locale = useLocale();
  const { isDark, toggleTheme } = useTheme();
  const pathname = usePathname();

  // Close the drawer whenever the route changes — clicking a Link inside the
  // drawer would otherwise navigate but leave the panel + backdrop open over
  // the new page. Triggers the existing close handler wired up in SiteNav.
  // The dataset flag tells SiteNav's close handler to skip the scroll-restore
  // so the destination page starts at the top instead of the old scrollY.
  useEffect(() => {
    const drawer = document.getElementById('burgerDrawer');
    if (drawer?.classList.contains('active')) {
      drawer.dataset.scrollSuppress = 'nav';
      document.getElementById('burgerClose')?.click();
    }
  }, [pathname]);

  const handleLoginBtn = useCallback(() => {
    document.getElementById('burgerClose')?.click();
    if (user) {
      const href = locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`;
      window.location.assign(href);
    } else {
      openLoginModal();
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
        <nav className="burger-primary" aria-label="Primary">
          <Link href="/news" className="burger-primary-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
              <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
            </svg>
            <span>{t('footer.news')}</span>
          </Link>
          <Link href="/map" className="burger-primary-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/>
              <line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
            <span>{t('footer.map')}</span>
          </Link>
          <Link href="/bezirk" className="burger-primary-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>{t('burger.bezirke')}</span>
          </Link>
          {/* Pre-hydration bootstrap in [locale]/layout.tsx may set .logged-in
              + username from _authHint, and BridgeAuth overwrites the span on
              auth state change. Suppress hydration warnings on both. */}
          <button type="button" className="burger-primary-item" id="loginBtn" onClick={handleLoginBtn} suppressHydrationWarning>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span suppressHydrationWarning>{t('footer.signIn')}</span>
          </button>
        </nav>

        <hr className="burger-section-divider" aria-hidden="true" />

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
        </div>

        <hr className="burger-section-divider" aria-hidden="true" />

        <nav className="burger-secondary" aria-label="More">
          <Link href="/about" className="burger-secondary-item" id="openAbout">{t('burger.about')}</Link>
          <Link href="/contact" className="burger-secondary-item" id="openContact">{t('burger.contact')}</Link>
          <Link href="/press" className="burger-secondary-item" id="openPress">{t('burger.press')}</Link>
          <Link href="/impressum" className="burger-secondary-item" id="openImpressum">{t('burger.impressum')}</Link>
        </nav>
        <div className="burger-theme-row">
          <button type="button" className="theme-toggle" aria-label="Toggle dark mode" aria-pressed={isDark} onClick={toggleTheme}>
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
            >
              EN
            </button>
            <button
              className={`lang-btn${lang === 'de' ? ' active' : ''}`}
              data-lang="de"
              aria-label="Deutsch"
              onClick={() => setLang('de')}
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
