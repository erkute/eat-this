'use client';

import { useCallback, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { useAuth, useLoginModal } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';
import { routing } from '@/i18n/routing';
import { Link, usePathname } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';

export interface BurgerCloseDetail {
  /** Skip the body-scroll restore — for cross-page navigation where the
   *  destination should start at the top, not the previous page's scrollY. */
  suppressScroll?: boolean;
}

export default function BurgerDrawer() {
  const { t, lang, setLang } = useTranslation();
  const { user } = useAuth();
  const { open: openLogin } = useLoginModal();
  const { isDark, toggleTheme } = useTheme();
  const locale = useLocale();
  const pathname = usePathname();

  // Drawer close + body-scroll unlock. Self-managed inside BurgerDrawer:
  // close-on-X, close-on-backdrop-click, and close-on-navigation all live
  // here rather than in SiteNav, so they work on every route.
  const closeBurger = useCallback((restoreScroll: boolean = true) => {
    const drawer = document.getElementById('burgerDrawer');
    if (!drawer?.classList.contains('active')) return;
    drawer.classList.remove('active');
    // Unlock body scroll (mirror of the open-lock set when the drawer opened).
    const wasMobile = window.innerWidth < 768;
    if (wasMobile) {
      const stored = document.body.dataset.burgerLockY;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (restoreScroll && stored) {
        const y = parseInt(stored, 10) || 0;
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
      delete document.body.dataset.burgerLockY;
    } else {
      document.body.style.overflow = '';
    }
  }, []);

  // Close on navigation — destination page starts at top (suppress scroll restore).
  useEffect(() => { closeBurger(false); }, [pathname, closeBurger]);

  // Wire up X-button + backdrop click handlers to the drawer's DOM children.
  useEffect(() => {
    const closeBtn = document.getElementById('burgerClose');
    const backdrop = document.getElementById('burgerBackdrop');
    const handler = () => closeBurger(true);
    closeBtn?.addEventListener('click', handler);
    backdrop?.addEventListener('click', handler);
    return () => {
      closeBtn?.removeEventListener('click', handler);
      backdrop?.removeEventListener('click', handler);
    };
  }, [closeBurger]);

  const handleLoginBtn = useCallback(() => {
    closeBurger(true);
    if (!user) {
      openLogin();
      return;
    }
    const href = locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`;
    window.location.assign(href);
  }, [closeBurger, openLogin, user, locale]);

  // Event-delegated close: any anchor click bubbles up; we dispatch the close
  // event so same-route navigation also closes the drawer.
  const onPanelClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('a')) closeBurger();
  }, [closeBurger]);

  return (
    <div className="burger-drawer" id="burgerDrawer">
      <div className="burger-drawer-backdrop" id="burgerBackdrop"></div>
      <div className="burger-drawer-panel" onClick={onPanelClick}>
        <button className="burger-drawer-close" id="burgerClose" aria-label="Close">×</button>

        <div className="bd-scroller">
          {/* In-flow (not pinned): scrolls with the menu so it never collides
              with the logo when the drawer content scrolls. */}
          <div className="bd-topbar">
            <div className="bd-lang" role="group" aria-label="Language / Sprache">
              <button
                className={`bd-lang-btn${lang === 'de' ? ' on' : ''}`}
                aria-label="Deutsch"
                onClick={() => setLang('de')}
              >
                DE
              </button>
              <span className="bd-lang-sep" aria-hidden="true">/</span>
              <button
                className={`bd-lang-btn${lang === 'en' ? ' on' : ''}`}
                aria-label="English"
                onClick={() => setLang('en')}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              className={`bd-theme-toggle${isDark ? ' on' : ''}`}
              aria-label="Toggle dark mode"
              aria-pressed={isDark}
              onClick={toggleTheme}
            >
              <span className="bd-theme-label">{t('theme.darkMode')}</span>
              <span className="bd-theme-track">
                <span className="bd-theme-thumb"></span>
              </span>
            </button>
          </div>

          <div className="bd-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/eat-this-logo.webp?v=6" alt="Eat This" width="660" height="265" />
          </div>

          <nav className="bd-nav" aria-label="Primary">
            <Link href="/" className="bd-nav-item">{t('burger.home')}</Link>
            <MapIntentLink href="/map" className="bd-nav-item">{t('burger.map')}</MapIntentLink>
            {/* Profile/login is a primary action, not footer furniture. Keep it
                high in the stack so signed-in users can reach their deck fast. */}
            <button type="button" className="bd-nav-item bd-cta" id="loginBtn" onClick={handleLoginBtn} suppressHydrationWarning>
              <span suppressHydrationWarning>{user ? t('burger.profile') : t('burger.signIn')}</span>
            </button>
            <Link href="/must-eats" className="bd-nav-item">{t('burger.mustEats')}</Link>
            {/* Remy lives only on the home hub now (no corner launcher elsewhere),
                so the burger is the way to reach him from any page — scrolls to
                his "Frag Remy" section via HubHashScroll. */}
            <Link href="/#hub-fragremy" className="bd-nav-item">{t('burger.fragRemy')}</Link>
            <Link href="/news" className="bd-nav-item">{t('burger.aufDemTeller')}</Link>
            <Link href="/#hub-allberlin" className="bd-nav-item">{t('burger.boosterPacks')}</Link>
            <Link href="/about" className="bd-nav-item">{t('burger.about')}</Link>
          </nav>

          <div className="bd-foot">
            <Link href="/impressum" className="bd-foot-link" id="openImpressum">{t('burger.impressum')}</Link>
            <Link href="/datenschutz" className="bd-foot-link" id="openDatenschutzFromBurger">{t('modals.datenschutz.title')}</Link>
            <Link href="/agb" className="bd-foot-link" id="openAgbFromBurger">{t('modals.agb.title')}</Link>
            <Link href="/contact" className="bd-foot-link" id="openContact">{t('burger.contact')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
