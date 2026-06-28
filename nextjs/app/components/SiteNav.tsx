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
    if (activePage === 'map') return;
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }).connection;
    if (connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') return;

    const warmMap = () => {
      ;(router.prefetch as (href: string) => void)('/map');
      void preloadMapSurface();
    };
    const ric = window.requestIdleCallback as ((cb: IdleRequestCallback, opts?: IdleRequestOptions) => number) | undefined;
    if (ric) {
      const id = ric(warmMap, { timeout: 3500 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(warmMap, 2200);
    return () => window.clearTimeout(id);
  }, [activePage, router]);

  return (
    <>
      <a href="#appPages" className="skip-link">{t('a11y.skip')}</a>
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
            <span className={styles.logoWord}>Eat This</span>
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
