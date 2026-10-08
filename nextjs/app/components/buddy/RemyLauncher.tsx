'use client';

// Der dauerhafte Weg zu Remy, auf jeder Seite unten rechts.
//
// Er lädt NICHTS von der Chat-Maschinerie: der Knopf schickt nur ein
// BUDDY_ASK_EVENT, RemyDock mountet das Widget beim ersten. Hover/Fokus wärmt
// den Chunk vor, damit das Panel beim Tap schon da ist.
//
// Wer ihn nicht will, tippt das ✕ in der Ecke — dann ist Remy für diesen Besuch
// weg. Für DIESEN Besuch, nicht für immer: ein dauerhaft weggeklickter Remy
// wäre für den Besucher nicht mehr auffindbar. Über die Bühne der Startseite
// bleibt er in jedem Fall erreichbar.
//
// Nicht auf /map: dort sitzt unten rechts der Standort-Knopf, der an der Kante
// der Liste mitwandert (MapControls .fab, `--locate-bottom` pro Frame). Zwei
// Knöpfe übereinander an einer wandernden Kante ist eine eigene Entscheidung —
// Remy gehört dort eher in die Such-Leiste als in die Ecke.
//
// Nicht in Magazin-Artikeln (/news/<slug>, Ansage 02.10.2026): dort wird
// gelesen, und der Knopf sass in der Ecke über dem Text. Die Übersicht
// /news behält ihn.

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from '@/app/components/SiteImage';
import { useLocale } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import { afterHeroIntro } from '@/lib/home/heroIntro';
import { prefersReducedMotion } from '@/lib/guestCardShake';
import { CloseIcon } from '@/app/components/map/icons';
import { preloadBuddyWidget } from './RemyDock';
import styles from './RemyLauncher.module.css';

const DISMISS_KEY = 'buddyLauncherHidden';
/** Length of the entrance (RemyLauncher.module.css, `remyPeek`). */
const ENTRANCE_MS = 2300;
/** Keep in sync with `remyExit` in RemyLauncher.module.css. */
const EXIT_MS = 760;

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export default function RemyLauncher() {
  const pathname = usePathname();
  const locale = useLocale();
  // Server und erster Client-Render müssen dieselbe Kachel liefern. Liest der
  // Initializer schon sessionStorage, kann die Server-Kachel ohne React-Handler
  // stehen bleiben: sichtbar, aber weder Remy noch das X reagieren auf Taps.
  const [visibility, setVisibility] = useState<'loading' | 'visible' | 'leaving' | 'hidden'>('loading');
  const leaving = visibility === 'leaving';
  const exitTimer = useRef<number | null>(null);
  useEffect(() => {
    setVisibility(readDismissed() ? 'hidden' : 'visible');
    return () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    };
  }, []);
  /* Auf der Startseite erscheint er erst, wenn der grosse Remy den Vorhang
     weggeschoben hat (Ansage 30.09.2026): solange `data-hero-intro` am
     <html> steht, wartet er unsichtbar; faellt es, guckt erst sein Kopf von
     der Seite herein, dann waechst das Gelb um ihn herum. Ohne Auftritt
     (andere Seiten, reduzierte Bewegung) steht er einfach da. */
  const [entrance, setEntrance] = useState<'waiting' | 'playing' | null>(null);
  useEffect(() => {
    if (!document.documentElement.hasAttribute('data-hero-intro')) return;
    setEntrance('waiting');
    let timer = 0;
    const cancel = afterHeroIntro(() => {
      setEntrance('playing');
      timer = window.setTimeout(() => setEntrance(null), ENTRANCE_MS);
    });
    return () => {
      cancel();
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = useCallback(() => {
    if (exitTimer.current !== null) return;
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Gesperrter Speicher: dann gilt es nur für diese Seite. Immer noch
      // besser als ein Knopf, der sich nicht wegtippen lässt.
    }
    if (prefersReducedMotion()) {
      setVisibility('hidden');
      return;
    }
    setEntrance(null);
    setVisibility('leaving');
    exitTimer.current = window.setTimeout(() => setVisibility('hidden'), EXIT_MS);
  }, []);

  if (visibility === 'hidden') return null;
  // Keep purchase controls unobstructed on pack pages.
  if (pathname === '/packs' || pathname.startsWith('/pack/')) return null;
  if (pathname === '/map' || pathname.startsWith('/map/')) return null;
  if (pathname.startsWith('/news/')) return null;

  const label = locale === 'en' ? 'Ask Remy' : 'Frag Remy';
  const hide = locale === 'en' ? 'Hide Remy' : 'Remy ausblenden';
  return (
    <div
      className={styles.dock}
      data-entrance={entrance ?? undefined}
      data-leaving={leaving || undefined}
      aria-hidden={leaving || undefined}
    >
      <button
        type="button"
        className={styles.launcher}
        data-buddy-launcher=""
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-controls="buddy-panel"
        disabled={visibility !== 'visible'}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') void preloadBuddyWidget();
        }}
        onFocus={() => void preloadBuddyWidget()}
        onClick={() => dispatchBuddyAsk()}
      >
        {/* Über den Optimierer statt als rohes <img>: das Original ist
            791×876 und 107 KB und lud auf JEDER Seite neben dem LCP-Foto. Die
            58er-Kachel zoomt 1,45-fach (siehe .face), sichtbar sind also rund
            84 CSS-px — daraus wählt next/image die 256er-Stufe, ~13 KB. */}
        <span className={styles.head}>
          <Image
            className={`${styles.face} ${styles.faceSmile}`}
            src="/buddy/buddy-smile.webp"
            alt=""
            width={791}
            height={876}
            sizes="84px"
          />
          {/* Beim Scrollen über die Startseite quatscht er (HubMotion setzt
            `data-remy-talk` am <html>). Das Lächeln ist in anderem Ausschnitt
            gezeichnet als der offene Mund — also redet das neutrale Gesicht,
            dessen Zähne-Ebene genau darauf passt (siehe BuddyAvatar). */}
          <span className={styles.talk} aria-hidden="true">
            <Image
              className={styles.face}
              src="/buddy/buddy.webp"
              alt=""
              width={1024}
              height={1024}
              sizes="84px"
            />
            <Image
              className={`${styles.face} ${styles.talkOpen}`}
              src="/buddy/buddy-open.webp"
              alt=""
              width={1024}
              height={1024}
              sizes="84px"
            />
          </span>
        </span>
      </button>
      {/* Eigener Knopf neben dem großen, nicht darin: ein <button> im <button>
          ist kein gültiges Markup. */}
      <button
        type="button"
        className={styles.dismiss}
        data-buddy-launcher-dismiss=""
        aria-label={hide}
        title={hide}
        disabled={visibility !== 'visible'}
        onClick={dismiss}
      >
        <CloseIcon />
      </button>
    </div>
  );
}
