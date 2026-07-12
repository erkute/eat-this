'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { Link, useRouter } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import { openBurgerDrawer } from './burgerDrawerState';
import { preloadMapSurface } from './map/preloadMapSurface';
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
  const { t, lang } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
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

  useEffect(() => {
    const root = document.documentElement;
    const navbar = document.getElementById('navbar');
    root.classList.remove('navbar-collapsed', 'navbar-detached', 'navbar-hidden');
    if (!navbar || activePage === 'map') return;

    const media = window.matchMedia('(max-width: 767px)');
    let lastY = window.scrollY || window.pageYOffset || 0;
    let ticking = false;
    let collapseTimer: number | undefined;
    let showFrame: number | undefined;

    const show = () => {
      if (collapseTimer !== undefined) {
        window.clearTimeout(collapseTimer);
        collapseTimer = undefined;
      }
      if (showFrame !== undefined) return;

      const wasCollapsed = root.classList.contains('navbar-collapsed');
      root.classList.remove('navbar-collapsed');
      if (!wasCollapsed) {
        root.classList.remove('navbar-hidden');
        return;
      }

      // Restore the fully translated state for one frame before revealing it,
      // otherwise display:none -> visible skips the return transition.
      void navbar.offsetHeight;
      showFrame = window.requestAnimationFrame(() => {
        showFrame = undefined;
        root.classList.remove('navbar-hidden');
      });
    };
    const hide = () => {
      if (showFrame !== undefined) {
        window.cancelAnimationFrame(showFrame);
        showFrame = undefined;
      }
      if (!root.classList.contains('navbar-hidden')) {
        root.classList.add('navbar-hidden');
      }
      if (collapseTimer !== undefined || root.classList.contains('navbar-collapsed')) return;

      collapseTimer = window.setTimeout(() => {
        collapseTimer = undefined;
        if (root.classList.contains('navbar-hidden')) {
          root.classList.add('navbar-collapsed');
        }
      }, 280);
    };
    const apply = () => {
      ticking = false;
      const y = Math.max(0, window.scrollY || window.pageYOffset || 0);
      const delta = y - lastY;

      if (!media.matches || y < 36) {
        show();
      } else if (delta > 6) {
        hide();
      } else if (delta < -6) {
        show();
      }

      lastY = y;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(apply);
    };

    const onMediaChange = () => {
      show();
      lastY = window.scrollY || window.pageYOffset || 0;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    media.addEventListener('change', onMediaChange);

    return () => {
      window.removeEventListener('scroll', onScroll);
      media.removeEventListener('change', onMediaChange);
      if (collapseTimer !== undefined) window.clearTimeout(collapseTimer);
      if (showFrame !== undefined) window.cancelAnimationFrame(showFrame);
      root.classList.remove('navbar-collapsed', 'navbar-detached', 'navbar-hidden');
    };
  }, [activePage]);

  useEffect(() => {
    if (activePage === 'map') return;
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (
      connection?.saveData ||
      connection?.effectiveType === 'slow-2g' ||
      connection?.effectiveType === '2g'
    )
      return;

    const warmMap = () => {
      (router.prefetch as (href: string) => void)('/map');
      void preloadMapSurface();
    };
    const ric = window.requestIdleCallback as
      | ((cb: IdleRequestCallback, opts?: IdleRequestOptions) => number)
      | undefined;
    if (ric) {
      const id = ric(warmMap, { timeout: 3500 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(warmMap, 2200);
    return () => window.clearTimeout(id);
  }, [activePage, router]);

  return (
    <>
      <a href="#appPages" className="skip-link">
        {t('a11y.skip')}
      </a>
      <nav className="navbar" id="navbar">
        {/* Left: map text */}
        <div className="navbar-actions" style={{ flex: 1, justifyContent: 'flex-start' }}>
          <MapIntentLink
            href="/map"
            className={`navbar-icon-btn ${styles.mapSticker}${activePage === 'map' ? ' active' : ''}`}
            id="navMapBtn"
            aria-label="Map"
          >
            <span className={styles.mapWord}>Map</span>
          </MapIntentLink>
        </div>
        {/* Center: Logo */}
        <div className="navbar-home">
          <Link href="/" className={styles.logo} aria-label="Eat This — Start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pics/eat-this-logo.webp?v=6"
              alt="Eat This"
              width="1660"
              height="667"
              decoding="async"
              className={styles.logoImg}
            />
          </Link>
        </div>
        {/* Right: menu text (News lives in the drawer) */}
        <div className="navbar-actions" style={{ flex: 1, justifyContent: 'flex-end' }}>
          <button
            className={`burger-btn ${styles.menuSticker}`}
            id="burgerBtn"
            aria-label={lang === 'de' ? 'Menü' : 'Menu'}
            aria-controls="burgerDrawer"
            aria-expanded="false"
            onClick={openBurgerDrawer}
          >
            <span className={styles.menuWord}>{lang === 'de' ? 'Menü' : 'Menu'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
