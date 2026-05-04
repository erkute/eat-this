'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { routing } from '@/i18n/routing';
import LocaleLink from './LocaleLink';

export default function SiteNav() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const locale = useLocale();
  const router = useRouter();

  // Header profile icon: route to /profile if signed in, otherwise /login.
  // Logged-in: hard-navigate (profile page needs fresh server data).
  // Logged-out: soft-nav via router.push so the intercepting @modal/(.)login
  // route fires — the current page stays mounted behind the overlay.
  const handleProfileClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      const href = locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`;
      window.location.assign(href);
    } else {
      const href = locale === routing.defaultLocale ? '/login' : `/${locale}/login`;
      router.push(href);
    }
  }, [user, locale, router]);

  // Wire burger toggle here so it works on every (spa) route, including
  // /profile which doesn't render SPAShell (and therefore no BurgerDrawer).
  // On SPA pages app.min.js also attaches to these IDs — both are additive
  // and idempotent (classList.add/remove is safe to call twice).
  useEffect(() => {
    const drawer   = document.getElementById('burgerDrawer');
    const openBtn  = document.getElementById('burgerBtn');
    const closeBtn = document.getElementById('burgerClose');
    const backdrop = document.getElementById('burgerBackdrop');
    if (!drawer) return; // not present on this route — nothing to wire

    const open  = () => drawer.classList.add('active');
    // Also clear any body overflow lock set by app.min.js's S.lock() so
    // scroll is always restored when the burger closes via the React handler.
    const close = () => {
      drawer.classList.remove('active');
      document.body.style.overflow = '';
    };

    openBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
    return () => {
      openBtn?.removeEventListener('click', open);
      closeBtn?.removeEventListener('click', close);
      backdrop?.removeEventListener('click', close);
    };
  }, []);

  return (
    <>
      <a href="#appPages" className="skip-link">{t('a11y.skip')}</a>
      <nav className="navbar" id="navbar">
        <LocaleLink href="/" className="navbar-brand" data-page="start">
          <img
            src="/pics/eat.webp"
            alt="EAT THIS"
            className="brand-logo"
            width={36}
            height={36}
            decoding="async"
          />
        </LocaleLink>
        <div className="navbar-actions">
          <LocaleLink href="/news" className="navbar-icon-btn" id="navNewsBtn" aria-label="News" suppressHydrationWarning>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
              <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
            </svg>
          </LocaleLink>
          <LocaleLink href="/map" className="navbar-icon-btn" id="navMapBtn" aria-label="Map" suppressHydrationWarning>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/>
              <line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
          </LocaleLink>
          <a
            href={locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`}
            className="navbar-icon-btn"
            id="navProfileBtn"
            aria-label="Profile"
            onClick={handleProfileClick}
            suppressHydrationWarning
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </a>
          <button className="burger-btn" id="burgerBtn" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>
    </>
  );
}
