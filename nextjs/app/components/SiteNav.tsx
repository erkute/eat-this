'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Link, usePathname } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import { openBurgerDrawer } from './burgerDrawerState';
import styles from './SiteNav.module.css';

function pageSlugFromPath(path: string): string {
  if (path === '/') return 'start';
  if (path.startsWith('/news/') && path.length > 6) return 'news-article';
  return path.replace(/^\//, '').split('/')[0];
}

export default function SiteNav() {
  const { t, lang } = useTranslation();
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

  useEffect(() => {
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.dataset.visibility = 'visible';
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

      const wasCollapsed = navbar.dataset.visibility === 'collapsed';
      if (!wasCollapsed) {
        navbar.dataset.visibility = 'visible';
        return;
      }

      // Restore the fully translated state for one frame before revealing it,
      // otherwise display:none -> visible skips the return transition.
      navbar.dataset.visibility = 'hidden';
      void navbar.offsetHeight;
      showFrame = window.requestAnimationFrame(() => {
        showFrame = undefined;
        navbar.dataset.visibility = 'visible';
      });
    };
    const hide = () => {
      if (showFrame !== undefined) {
        window.cancelAnimationFrame(showFrame);
        showFrame = undefined;
      }
      if (navbar.dataset.visibility === 'collapsed') return;
      if (navbar.dataset.visibility !== 'hidden') {
        navbar.dataset.visibility = 'hidden';
      }
      if (collapseTimer !== undefined) return;

      collapseTimer = window.setTimeout(() => {
        collapseTimer = undefined;
        if (navbar.dataset.visibility === 'hidden') {
          navbar.dataset.visibility = 'collapsed';
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
      navbar.dataset.visibility = 'visible';
    };
  }, [activePage]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('a11y.skip')}
      </a>
      <nav
        className={styles.nav}
        id="navbar"
        data-nav-page={activePage}
        data-visibility="visible"
      >
        {/* Left: map text */}
        <div className={`${styles.actions} ${styles.actionsStart}`}>
          <MapIntentLink
            href="/map"
            className={styles.control}
            id="navMapBtn"
            aria-label="Map"
          >
            <span className={styles.mapWord}>Map</span>
          </MapIntentLink>
        </div>
        {/* Center: Logo */}
        <div className={styles.home}>
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
        <div className={`${styles.actions} ${styles.actionsEnd}`}>
          <button
            type="button"
            className={styles.control}
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
