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
      <nav className="navbar" id="navbar">
        <div className="navbar-home">
          <Link href="/" className={styles.logo} aria-label="Eat This — Start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/eat-this-logo.webp?v=6" alt="Eat This" className={styles.logoImg} />
          </Link>
        </div>
        <div className="navbar-actions">
          <Link href="/news" className={`navbar-icon-btn${activePage === 'news' ? ' active' : ''}`} id="navNewsBtn" aria-label="News">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/icon-news.webp" alt="" width={22} height={22} style={{ display: 'block' }} />
          </Link>
          <Link href="/map" className={`navbar-icon-btn${activePage === 'map' ? ' active' : ''}`} id="navMapBtn" aria-label="Map">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/icon-map.webp" alt="" width={22} height={22} style={{ display: 'block' }} />
          </Link>
          <a
            id="navProfileBtn"
            href={locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`}
            className={`navbar-icon-btn${activePage === 'profile' ? ' active' : ''}`}
            aria-label="Profile"
            onClick={handleProfileClick}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </a>
          <button className="burger-btn" id="burgerBtn" aria-label="Menu">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/icon-burger.webp" alt="" width={24} height={24} style={{ display: 'block' }} />
          </button>
        </div>
      </nav>
    </>
  );
}
