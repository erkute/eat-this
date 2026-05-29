'use client';

import { useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { useAuth, useLoginModal } from '@/lib/auth';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import type { BurgerCloseDetail } from './BurgerDrawer';
import styles from './SiteNav.module.css';

// Strip the optional /en prefix to get the route the SPA cares about.
function stripLocale(path: string): string {
  if (path === '/en' || path.startsWith('/en/')) return path.slice(3) || '/';
  return path;
}

function pageSlugFromPath(path: string): string {
  const p = stripLocale(path);
  if (p === '/') return 'start';
  if (p.startsWith('/news/') && p.length > 6) return 'news-article';
  return p.replace(/^\//, '').split('/')[0];
}

export default function SiteNav() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { open: openLogin } = useLoginModal();
  const locale = useLocale();
  const pathname = usePathname();
  const activePage = pageSlugFromPath(pathname);

  // Keep the html[data-active-page] attribute in sync with the current
  // route. The bootstrap script in app/[locale]/layout.tsx sets this on
  // initial load, but client-side navigation doesn't re-run that script,
  // which is why CSS selectors like [data-active-page="map"] would not
  // apply when navigating from /start → /map. Mirror activePage to the
  // html element on every route change.
  useEffect(() => {
    document.documentElement.setAttribute('data-active-page', activePage);
  }, [activePage]);

  // Header profile icon: route to /profile if signed in, otherwise open the
  // login modal (mounted by BridgeAuth as a React portal).
  const handleProfileClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      const href = locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`;
      window.location.assign(href);
    } else {
      openLogin();
    }
  }, [user, locale, openLogin]);

  useEffect(() => {
    const drawer   = document.getElementById('burgerDrawer');
    const openBtn  = document.getElementById('burgerBtn');
    const closeBtn = document.getElementById('burgerClose');
    const backdrop = document.getElementById('burgerBackdrop');
    if (!drawer) return;

    let scrollY = 0;
    // Tracks whether THIS effect locked the body, so a later unlock (or the
    // cleanup-on-unmount) only undoes what we did and doesn't clobber a lock
    // owned by a modal or sheet.
    let lockMode: 'fixed' | 'overflow' | null = null;
    const isMobile = () => window.innerWidth < 768;
    const lock = () => {
      if (isMobile()) {
        scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        lockMode = 'fixed';
      } else {
        document.body.style.overflow = 'hidden';
        lockMode = 'overflow';
      }
    };
    const unlock = (restoreScroll = true) => {
      if (lockMode === 'fixed') {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        // Skip the scroll-restore when the close was triggered by navigation
        // (e.g. user clicked a Link inside the drawer) — the new page should
        // start at the top, not at the previous page's scroll position.
        if (restoreScroll) {
          requestAnimationFrame(() => window.scrollTo(0, scrollY));
        }
      } else if (lockMode === 'overflow') {
        document.body.style.overflow = '';
      }
      lockMode = null;
    };

    const open  = () => { drawer.classList.add('active'); lock(); };
    const close = (restoreScroll = true) => {
      drawer.classList.remove('active');
      unlock(restoreScroll);
    };
    const onUserClose = () => close(true);
    // BurgerDrawer dispatches `burger:close` on route change with
    // `suppressScroll: true` so the destination page starts at the top.
    const onBurgerCloseEvent = (e: Event) => {
      const detail = (e as CustomEvent<BurgerCloseDetail>).detail;
      close(!detail?.suppressScroll);
    };

    openBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', onUserClose);
    backdrop?.addEventListener('click', onUserClose);
    drawer.addEventListener('burger:close', onBurgerCloseEvent);
    return () => {
      openBtn?.removeEventListener('click', open);
      closeBtn?.removeEventListener('click', onUserClose);
      backdrop?.removeEventListener('click', onUserClose);
      drawer.removeEventListener('burger:close', onBurgerCloseEvent);
      // Cross-layout navigation while the drawer is open: our body-lock would
      // persist and break scrolling on the next page. Undo without restoring
      // scroll — the new page should start at the top.
      unlock(false);
    };
  }, []);

  return (
    <>
      <a href="#appPages" className="skip-link">{t('a11y.skip')}</a>
      {/* Hidden defs SVG: shared wonky-marker filter referenced by alle
          navbar Icons. feTurbulence + feDisplacementMap = hand-drawn-feel
          ohne jedes Icon einzeln neu zu zeichnen. */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" className="nav-icon-defs">
        <defs>
          <filter id="navWonky" x="-25%" y="-25%" width="150%" height="150%">
            {/* Scribble-Look: 3× über die SourceGraphic gezeichnet, jeder
                Pass mit anderem Turbulence-Seed + steigender Displacement-
                Scale → drei leicht verschobene Kopien jeder Linie wie ein
                Bleistift, der mehrmals drübergeführt wurde. */}
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="1" result="t1"/>
            <feDisplacementMap in="SourceGraphic" in2="t1" scale="1.2" result="d1"/>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="t2"/>
            <feDisplacementMap in="SourceGraphic" in2="t2" scale="2.2" result="d2"/>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="13" result="t3"/>
            <feDisplacementMap in="SourceGraphic" in2="t3" scale="3.0" result="d3"/>
            <feMerge>
              <feMergeNode in="d1"/>
              <feMergeNode in="d2"/>
              <feMergeNode in="d3"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      <nav className="navbar" id="navbar">
        <div className="navbar-home">
          <Link href="/" className={styles.logo} aria-label="Eat This — Start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/eat-this-logo.webp" alt="Eat This" className={styles.logoImg} />
          </Link>
        </div>
        <div className="navbar-actions">
          <Link href="/news" className={`navbar-icon-btn${activePage === 'news' ? ' active' : ''}`} id="navNewsBtn" aria-label="News">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" filter="url(#navWonky)">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
              <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
            </svg>
          </Link>
          <Link href="/map" className={`navbar-icon-btn${activePage === 'map' ? ' active' : ''}`} id="navMapBtn" aria-label="Map">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" filter="url(#navWonky)">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/>
              <line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
          </Link>
          <a
            id="navProfileBtn"
            href={locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`}
            className={`navbar-icon-btn${activePage === 'profile' ? ' active' : ''}`}
            aria-label="Profile"
            onClick={handleProfileClick}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" filter="url(#navWonky)">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </a>
          <button className="burger-btn" id="burgerBtn" aria-label="Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" filter="url(#navWonky)">
              <line x1="4" y1="8" x2="20" y2="8"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <line x1="4" y1="16" x2="20" y2="16"/>
            </svg>
          </button>
        </div>
      </nav>
    </>
  );
}
