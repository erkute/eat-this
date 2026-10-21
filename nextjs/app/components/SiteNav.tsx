'use client';

import { useEffect, useRef } from 'react';
import { appScroller } from '@/lib/dom/appScroller';
import Image from '@/app/components/SiteImage';
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
  const reading = activePage === 'news-article' || activePage === 'restaurant';
  const progressRef = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Oben auf der Startseite liegt der Kopf durchsichtig über dem gelben
  // Aufmacher; sobald gescrollt ist, blendet seine Fläche ein
  // (SiteNav.module.css, wie bei gucci.com — Ansage 21.10.2026).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || activePage !== 'start') return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const scroller = appScroller();
      nav.toggleAttribute('data-scrolled', (scroller ? scroller.scrollTop : window.scrollY) > 4);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    document.addEventListener('scroll', schedule, { passive: true, capture: true });
    return () => {
      document.removeEventListener('scroll', schedule, { capture: true });
      cancelAnimationFrame(frame);
      nav.removeAttribute('data-scrolled');
    };
  }, [activePage]);

  useEffect(() => {
    if (!reading) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const scroller = appScroller();
      const top = scroller ? scroller.scrollTop : window.scrollY;
      const content = document.querySelector<HTMLElement>('[data-reading-content]');
      const viewBottom = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;
      const distance = content
        ? top + content.getBoundingClientRect().bottom - viewBottom
        : scroller
        ? scroller.scrollHeight - scroller.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      const progress = distance > 0 ? Math.min(1, Math.max(0, top / distance)) : 0;
      const bar = progressRef.current;
      const nav = bar?.parentElement;
      if (!bar || !nav) return;
      bar.style.transform = `scaleX(${progress})`;
      // Was die rote Fläche schon bedeckt, steht weiß: jedes Wort und die
      // Wortmarke bekommen ihren bedeckten Anteil als --fill (0–1).
      const box = nav.getBoundingClientRect();
      const edge = box.left + progress * box.width;
      nav.querySelectorAll<HTMLElement>('[data-reading-fill]').forEach((el) => {
        const word = el.getBoundingClientRect();
        const fill = word.width > 0 ? Math.min(1, Math.max(0, (edge - word.left) / word.width)) : 0;
        el.style.setProperty('--fill', String(fill));
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    document.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    const content = document.querySelector('main');
    if (content) observer.observe(content);
    update();
    return () => {
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [pathname, reading]);

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
    if (!navbar || activePage === 'map' || reading) return;

    const media = window.matchMedia('(max-width: 767.98px)');
    let lastY = window.scrollY || window.pageYOffset || 0;
    let ticking = false;
    let collapseTimer: number | undefined;
    let showFrame: number | undefined;

    // `data-leaving` steht nur beim Wegfahren: dann lässt Safari die Farbe der
    // Statusleiste mit Beginn der Bewegung los (SiteNav.module.css).
    const show = () => {
      if (collapseTimer !== undefined) {
        window.clearTimeout(collapseTimer);
        collapseTimer = undefined;
      }
      delete navbar.dataset.leaving;
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
        navbar.dataset.leaving = '';
        navbar.dataset.visibility = 'hidden';
      }
      if (collapseTimer !== undefined) return;

      collapseTimer = window.setTimeout(() => {
        collapseTimer = undefined;
        if (navbar.dataset.visibility === 'hidden') {
          navbar.dataset.visibility = 'collapsed';
          delete navbar.dataset.leaving;
        }
      }, 280);
    };
    const apply = () => {
      ticking = false;
      const y = Math.max(0, window.scrollY || window.pageYOffset || 0);
      const delta = y - lastY;

      // Auf der Startseite fliegt die Wortmarke beim Scrollen in den Header
      // (HeroMarkFlight setzt `data-nav-hold`, solange das läuft). Klappte die
      // Leiste dabei wie sonst nach 36px weg, würde die Marke im selben Moment
      // mit verschwinden, in dem sie ankommt. Andere Seiten setzen das
      // Attribut nie und verhalten sich unverändert.
      const hold = document.documentElement.hasAttribute('data-nav-hold');

      if (!media.matches || y < 36 || hold) {
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
      delete navbar.dataset.leaving;
    };
  }, [activePage, reading]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('a11y.skip')}
      </a>
      <nav ref={navRef} className={styles.nav} id="navbar" data-nav-page={activePage} data-visibility="visible">
        {reading && <span ref={progressRef} className={styles.readingProgress} aria-hidden="true" data-reading-progress="" />}
        {/* Left: map text */}
        <div className={`${styles.actions} ${styles.actionsStart}`}>
          <MapIntentLink href="/map" className={styles.control} id="navMapBtn" aria-label="Map">
            <span className={styles.mapWord} data-reading-fill="">Map</span>
          </MapIntentLink>
        </div>
        {/* Center: Logo */}
        <div className={styles.home}>
          {/* `data-nav-logo` ist der Landepunkt der fliegenden Wortmarke
              (HeroMarkFlight misst diesen Slot aus). Der Link bleibt
              zugänglich — er trägt seinen Namen über aria-label —, nur das
              Bild tritt zurück, solange der Flieger seinen Platz besetzt. */}
          <Link href="/" className={styles.logo} aria-label="Eat This — Start" data-nav-logo="" data-reading-fill="">
            <Image
              src="/pics/home/wordmark.webp?v=1"
              alt="Eat This"
              width={1124}
              height={274}
              sizes="80px"
              loading="lazy"
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
            <span className={styles.menuWord} data-reading-fill="">{lang === 'de' ? 'Menü' : 'Menu'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
