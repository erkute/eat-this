'use client';

import { useCallback, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useAuth, useLoginModal } from '@/lib/auth';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import { closeBurgerDrawer } from './burgerDrawerState';

export default function BurgerDrawer() {
  const { t, lang, setLang } = useTranslation();
  const { user } = useAuth();
  const { open: openLogin } = useLoginModal();
  const pathname = usePathname();
  const router = useRouter();

  const drawerRef = useCallback((node: HTMLDivElement | null) => {
    if (node && !node.classList.contains('active')) node.setAttribute('inert', '');
  }, []);

  const closeBurger = useCallback((restoreScroll: boolean = true) => {
    closeBurgerDrawer(restoreScroll);
  }, []);

  // Close on navigation — destination page starts at top (suppress scroll restore).
  useEffect(() => {
    closeBurger(false);
  }, [pathname, closeBurger]);

  // Escape is global; visible controls below use React handlers.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeBurger(true);
        return;
      }
      if (event.key !== 'Tab') return;
      const drawer = document.getElementById('burgerDrawer');
      if (!drawer?.classList.contains('active')) return;
      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled]):not([tabindex="-1"])')
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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
    router.push('/profile');
  }, [closeBurger, openLogin, router, user]);

  // Event-delegated close: any anchor click bubbles up; we dispatch the close
  // event so same-route navigation also closes the drawer.
  const onPanelClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('a')) closeBurger();
    },
    [closeBurger]
  );

  return (
    <div ref={drawerRef} className="burger-drawer" id="burgerDrawer" aria-hidden="true" hidden>
      <button
        className="burger-drawer-backdrop"
        id="burgerBackdrop"
        type="button"
        tabIndex={-1}
        aria-label="Close menu"
        onClick={() => closeBurger(true)}
      ></button>
      <div className="burger-drawer-panel" onClick={onPanelClick}>
        <button
          type="button"
          className="burger-drawer-close"
          id="burgerClose"
          aria-label="Close"
          onClick={() => closeBurger(true)}
        >
          ×
        </button>

        <div className="bd-scroller">
          {/* In-flow (not pinned): scrolls with the menu so it never collides
              with the logo when the drawer content scrolls. */}
          <div className="bd-topbar">
            <div className="bd-lang" role="group" aria-label="Language / Sprache">
              <button
                type="button"
                className={`bd-lang-btn${lang === 'de' ? ' on' : ''}`}
                aria-label="Deutsch"
                onClick={() => setLang('de')}
              >
                DE
              </button>
              <span className="bd-lang-sep" aria-hidden="true">
                /
              </span>
              <button
                type="button"
                className={`bd-lang-btn${lang === 'en' ? ' on' : ''}`}
                aria-label="English"
                onClick={() => setLang('en')}
              >
                EN
              </button>
            </div>
          </div>

          <Link
            prefetch={false}
            href="/"
            className="bd-logo"
            aria-label={lang === 'de' ? 'Eat This — Start' : 'Eat This — Home'}
          >
            {/* The drawer sits translated off-screen until opened, so lazy here
                genuinely defers: eager cost every page load 50KB of wordmark
                nobody had asked to see yet. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pics/eat-this-logo.webp?v=6"
              alt="Eat This"
              width="660"
              height="265"
              loading="lazy"
              decoding="async"
            />
          </Link>

          {/* prefetch={false} auf ALLEN Drawer-Links: beim Öffnen werden 13
              Links gleichzeitig sichtbar, und Nexts Viewport-Prefetcher holte
              alle Routen mitten in der Tür-Animation — im Trace ~86ms
              Main-Thread-Arbeit während der Fahrt (30.08.2026). Die Menü-
              Navigation lädt stattdessen beim Tap. */}
          <nav className="bd-nav" aria-label="Primary">
            <MapIntentLink prefetch={false} href="/map" className="bd-nav-item">
              {t('burger.map')}
            </MapIntentLink>
            {/* Profile/login is a primary action, not footer furniture. Keep it
                high in the stack so signed-in users can reach their deck fast. */}
            <button
              type="button"
              className="bd-nav-item bd-cta"
              id="loginBtn"
              onClick={handleLoginBtn}
              suppressHydrationWarning
            >
              <span suppressHydrationWarning>
                {user ? t('burger.profile') : t('burger.signIn')}
              </span>
            </button>
            <Link prefetch={false} href="/must-eats" className="bd-nav-item">
              {t('burger.mustEats')}
            </Link>
            {/* Der Kategorie-Hub stand bis 24.08.2026 in keinem Menü, keinem
                Footer und keiner Rail — erreichbar war er nur über die
                Brotkrume einer Kategorieseite, also erst, wenn man schon drin
                war. Ergebnis: drei Aufrufe in vier Tagen, null Impressionen.
                Hier ist der Eingang. */}
            <Link prefetch={false} href="/kategorie" className="bd-nav-item">
              {t('burger.categories')}
            </Link>
            {/* Dasselbe für den Bezirks-Hub, gleiche Ursache, gleicher Tag: 20
                Aufrufe in vier Tagen bei 3.115 Pageviews gesamt. Anders als bei
                den Kategorien gibt es auf der Startseite keine Bezirks-Rail, an
                deren Ende ein Chip passen würde — dieser Eintrag ist der ganze
                Eingang. */}
            <Link prefetch={false} href="/bezirk" className="bd-nav-item">
              {t('burger.districts')}
            </Link>
            {/* Remy lives in the home hub now. From other pages the burger
                sends users back to
                his "Frag Remy" section via HubHashScroll. */}
            <Link prefetch={false} href="/#hub-fragremy" className="bd-nav-item">
              {t('burger.fragRemy')}
            </Link>
            <Link prefetch={false} href="/news" className="bd-nav-item">
              {t('burger.aufDemTeller')}
            </Link>
            <Link prefetch={false} href="/packs" className="bd-nav-item">
              {t('burger.boosterPacks')}
            </Link>
            <Link prefetch={false} href="/about" className="bd-nav-item">
              {t('burger.about')}
            </Link>
          </nav>

          <div className="bd-foot bd-legal-dock">
            <Link prefetch={false} href="/impressum" className="bd-foot-link" id="openImpressum">
              {t('burger.impressum')}
            </Link>
            <Link
              prefetch={false}
              href="/datenschutz"
              className="bd-foot-link"
              id="openDatenschutzFromBurger"
            >
              {t('modals.datenschutz.title')}
            </Link>
            <Link prefetch={false} href="/agb" className="bd-foot-link" id="openAgbFromBurger">
              {t('modals.agb.title')}
            </Link>
            <Link prefetch={false} href="/contact" className="bd-foot-link" id="openContact">
              {t('burger.contact')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
