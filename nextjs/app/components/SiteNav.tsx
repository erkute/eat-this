'use client';

import { useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';

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
  const locale = useLocale();
  const pathname = usePathname();
  const activePage = pageSlugFromPath(pathname);

  // Header profile icon: route to /profile if signed in, otherwise open the
  // login modal via window.openLoginModal (set by BridgeAuth as a React portal).
  const handleProfileClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      const href = locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`;
      window.location.assign(href);
    } else {
      window.openLoginModal?.();
    }
  }, [user, locale]);

  // navbar.scrolled toggle — replaces app.min.js's at()/je() handlers.
  // Desktop: window scroll. Mobile + start page: .app-page[data-page="start"]
  // scroll (since .app-page is the scroll container on mobile). Mobile +
  // non-start: navbar always non-scrolled.
  useEffect(() => {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    const isMobile = !window.matchMedia('(min-width: 768px)').matches;

    if (!isMobile) {
      const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 60);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }
    if (activePage === 'start') {
      const startPage = document.querySelector<HTMLElement>('.app-page[data-page="start"]');
      if (!startPage) return;
      const onScroll = () => navbar.classList.toggle('scrolled', startPage.scrollTop > 60);
      onScroll();
      startPage.addEventListener('scroll', onScroll, { passive: true });
      return () => startPage.removeEventListener('scroll', onScroll);
    }
    navbar.classList.remove('scrolled');
  }, [activePage]);

  useEffect(() => {
    const drawer   = document.getElementById('burgerDrawer');
    const openBtn  = document.getElementById('burgerBtn');
    const closeBtn = document.getElementById('burgerClose');
    const backdrop = document.getElementById('burgerBackdrop');
    if (!drawer) return;

    let scrollY = 0;
    const isMobile = () => window.innerWidth < 768;
    const lock = () => {
      if (isMobile()) {
        scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
      } else {
        document.body.style.overflow = 'hidden';
      }
    };
    const unlock = () => {
      if (document.body.style.position === 'fixed') {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        requestAnimationFrame(() => window.scrollTo(0, scrollY));
      } else {
        document.body.style.overflow = '';
      }
    };

    const open  = () => { drawer.classList.add('active'); lock(); };
    const close = () => { drawer.classList.remove('active'); unlock(); };

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
        <Link href="/" className="navbar-brand" data-page="start">
          <img
            src="/pics/eat.webp"
            alt="EAT THIS"
            className="brand-logo"
            width={36}
            height={36}
            decoding="async"
          />
        </Link>
        <div className="navbar-actions">
          <Link href="/news" className={`navbar-icon-btn${activePage === 'news' ? ' active' : ''}`} id="navNewsBtn" aria-label="News">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
              <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
            </svg>
          </Link>
          <Link href="/map" className={`navbar-icon-btn${activePage === 'map' ? ' active' : ''}`} id="navMapBtn" aria-label="Map">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/>
              <line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
          </Link>
          <a
            href={locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`}
            className="navbar-icon-btn"
            aria-label="Profile"
            onClick={handleProfileClick}
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
