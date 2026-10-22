'use client';

import { useCallback, useEffect, type ComponentProps } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useAuth, useLoginModal } from '@/lib/auth';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import MapIntentLink from './MapIntentLink';
import { closeBurgerDrawer } from './burgerDrawerState';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import { ThemeSwitch } from './ThemeSwitch';
import styles from './BurgerDrawer.module.css';

/* Ein Menü-Link, der erst auf Absicht lädt.
 *
 * `prefetch={false}` allein war zu teuer erkauft: es nimmt zwar den
 * Prefetch-Sturm beim Öffnen weg (Nexts Viewport-Prefetcher holte alle 13
 * Routen mitten in der Tür-Animation, ~86ms Main-Thread), kostet aber die
 * erste Menü-Navigation spürbar — gemessen am 30.08.2026 unter Slow 4G:
 * 1205ms kalt gegen 637ms warm.
 *
 * Beides geht: kein Prefetch, solange das Wort nur sichtbar ist, aber einer,
 * sobald der Finger daraufliegt. Derselbe Handgriff wie in MapIntentLink —
 * Pointer-Down kommt gut 100ms vor dem Klick, und der Prefetch läuft dann in
 * einem Frame, in dem nichts animiert.
 */
function DrawerLink({ href, children, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const preload = useCallback(() => {
    /* Der Hash gehört nicht in den Prefetch: `/#anker` und `/` sind
       dieselbe Route, aber nur die zweite Form kennt der Router. */
    const target = typeof href === 'string' ? href.split('#')[0] || '/' : null;
    if (target) (router.prefetch as (target: string) => void)(target);
  }, [href, router]);

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onPointerEnter={preload}
      onPointerDown={preload}
      onFocus={preload}
    >
      {children}
    </Link>
  );
}

export default function BurgerDrawer() {
  const { t, lang, setLang } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { open: openLogin } = useLoginModal();
  const pathname = usePathname();
  const router = useRouter();
  // Die Seite, auf der man steht, trägt im Menü ihr Ink-Etikett.
  const here = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) ? ('page' as const) : undefined;

  const drawerRef = useCallback((node: HTMLDivElement | null) => {
    if (node && !node.classList.contains('active')) node.setAttribute('inert', '');
  }, []);

  // `restoreScroll` bewusst ohne Vorgabewert: die Antwort ist an jeder
  // Aufrufstelle eine andere, und ein Default hat hier schon einmal die
  // falsche gewählt (siehe onPanelClick).
  const closeBurger = useCallback((restoreScroll: boolean) => {
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
    // Scrollposition zurückfahren darf nur, wer auf der Seite bleibt: nicht
    // angemeldet öffnet sich das Login-Modal über der aktuellen Seite,
    // angemeldet geht es weiter nach /profile — und dort wäre der Restore
    // dieselbe Falle wie bei den Menü-Links unten.
    closeBurger(!user);
    if (!user) {
      openLogin();
      return;
    }
    router.push('/profile');
  }, [closeBurger, openLogin, router, user]);

  // Event-delegated close: any anchor click bubbles up; we dispatch the close
  // event so same-route navigation also closes the drawer.
  //
  // Bewusst `false`: ein Link führt weg, die Zielseite beginnt oben. Der
  // Default `true` schrieb hier die Scrollposition der ALTEN Seite auf die
  // neue. Unter 768px sperrt der Drawer den Body per `position: fixed` und
  // führt beim Schließen `window.scrollTo(0, storedY)` nach — mit global
  // `scroll-behavior: smooth` eine sekundenlange Animation. Nexts eigenes
  // Scroll-nach-oben prüft genau einmal, ob der Seitenkopf im Viewport
  // steht; solange die Animation noch bei y=0 steht, sagt die Prüfung ja,
  // Next steigt aus, und die Animation trug den Leser danach auf die alte
  // Position. Live gemessen am 04.09.2026: /kategorie (y=1500) → /packs
  // landete bei 1500, /kategorie → /bezirk dagegen oben — ein Rennen, das
  // je nach Zielseite anders ausging. Der `pathname`-Effekt oben, der `false`
  // übergibt, rettet das nicht: da ist der Drawer längst zu und
  // closeBurgerDrawer steigt sofort wieder aus.
  const onPanelClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('a')) closeBurger(false);
    },
    [closeBurger]
  );

  return (
    <div ref={drawerRef} className={styles.drawer} id="burgerDrawer" aria-hidden="true" hidden>
      <button className={styles.backdrop} id="burgerBackdrop" type="button" tabIndex={-1}
        aria-label={lang === 'de' ? 'Menü schließen' : 'Close menu'} onClick={() => closeBurger(true)} />
      <div className={styles.panel} onClick={onPanelClick} role="dialog" aria-modal="true"
        aria-label="Navigation">
        <div className={styles.topbar}>
          <DrawerLink href="/" className={styles.logo}
            aria-label={lang === 'de' ? 'Eat This — Start' : 'Eat This — Home'}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/home/wordmark.webp?v=1" alt="Eat This" width="1124" height="274" loading="lazy" decoding="async" />
          </DrawerLink>
          <button type="button" className={styles.close} id="burgerClose" aria-label={lang === 'de' ? 'Schließen' : 'Close'} onClick={() => closeBurger(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
          </button>
        </div>
        <div className={styles.scroller}>
          <nav className={styles.nav} aria-label={lang === 'de' ? 'Hauptnavigation' : 'Primary'}>
            <MapIntentLink prefetch={false} href="/map" className={styles.navItem} aria-current={here('/map')}>{t('burger.map')}</MapIntentLink>
            <DrawerLink href="/news" className={styles.navItem} aria-current={here('/news')}>{t('burger.magazine')}</DrawerLink>
            <DrawerLink href="/must-eats" className={styles.navItem} aria-current={here('/must-eats')}>{t('burger.mustEats')}</DrawerLink>
            <DrawerLink href="/packs" className={styles.navItem} aria-current={here('/packs')}>{t('burger.boosterPacks')}</DrawerLink>
            <DrawerLink href="/kategorie" className={styles.navItem} aria-current={here('/kategorie')}>{t('burger.categories')}</DrawerLink>
            <button type="button" className={styles.navItem} onClick={() => { closeBurger(true); dispatchBuddyAsk(); }}>
              {t('burger.fragRemy')}
            </button>
            <DrawerLink href="/bezirk" className={styles.navItem} aria-current={here('/bezirk')}>{t('burger.districts')}</DrawerLink>
            <DrawerLink href="/about" className={styles.navItem} aria-current={here('/about')}>{t('burger.about')}</DrawerLink>
            {isAdmin && <DrawerLink href="/admin/stats" className={styles.navItem} aria-current={here('/admin/stats')}>Stats</DrawerLink>}
          </nav>
          <button type="button" className={`et-btn ${styles.cta}`} id="loginBtn" onClick={handleLoginBtn} suppressHydrationWarning>
            <span suppressHydrationWarning>{user ? t('burger.profile') : t('burger.signIn')}</span>
          </button>
          <div className={styles.foot}>
            <div className={styles.prefs}>
              <div className={styles.lang} role="group" aria-label="Language / Sprache">
                <button type="button" className={styles.langBtn} aria-pressed={lang === 'de'} aria-label="Deutsch" onClick={() => setLang('de')}>DE</button>
                <button type="button" className={styles.langBtn} aria-pressed={lang === 'en'} aria-label="English" onClick={() => setLang('en')}>EN</button>
              </div>
              <div className={styles.lang} role="group" aria-label={lang === 'de' ? 'Darstellung' : 'Appearance'}>
                <ThemeSwitch de={lang === 'de'} className={styles.langBtn} />
              </div>
            </div>
            <div className={styles.legal}>
              <DrawerLink href="/impressum" className={styles.footLink} id="openImpressum">{t('burger.impressum')}</DrawerLink>
              <DrawerLink href="/datenschutz" className={styles.footLink} id="openDatenschutzFromBurger">{t('modals.datenschutz.title')}</DrawerLink>
              <DrawerLink href="/agb" className={styles.footLink} id="openAgbFromBurger">{t('modals.agb.title')}</DrawerLink>
              <DrawerLink href="/contact" className={styles.footLink} id="openContact">{t('burger.contact')}</DrawerLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
