'use client';

import { useCallback, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { useAuth, useLoginModal } from '@/lib/auth';
import { routing } from '@/i18n/routing';
import { Link, usePathname } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import { closeBurgerDrawer } from './burgerDrawerState';

export default function BurgerDrawer() {
  const { t, lang, setLang } = useTranslation();
  const { user } = useAuth();
  const { open: openLogin } = useLoginModal();
  const locale = useLocale();
  const pathname = usePathname();

  const closeBurger = useCallback((restoreScroll: boolean = true) => {
    closeBurgerDrawer(restoreScroll);
  }, []);

  // Close on navigation — destination page starts at top (suppress scroll restore).
  useEffect(() => { closeBurger(false); }, [pathname, closeBurger]);

  // Escape is global; visible controls below use React handlers.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeBurger(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      closeBurger(false);
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
    <div className="burger-drawer" id="burgerDrawer" aria-hidden="true">
      <button className="burger-drawer-backdrop" id="burgerBackdrop" type="button" tabIndex={-1} aria-label="Close menu" onClick={() => closeBurger(true)}></button>
      <div className="burger-drawer-panel" onClick={onPanelClick}>
        <button className="burger-drawer-close" id="burgerClose" aria-label="Close" onClick={() => closeBurger(true)}>×</button>

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
            {/* Remy lives in the home hub now. From other pages the burger
                sends users back to
                his "Frag Remy" section via HubHashScroll. */}
            <Link href="/#hub-fragremy" className="bd-nav-item">{t('burger.fragRemy')}</Link>
            <Link href="/news" className="bd-nav-item">{t('burger.aufDemTeller')}</Link>
            <Link href="/packs" className="bd-nav-item">{t('burger.boosterPacks')}</Link>
            <Link href="/about" className="bd-nav-item">{t('burger.about')}</Link>
          </nav>

          <div className="bd-foot bd-legal-dock">
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
