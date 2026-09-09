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
// und den Block auf der Spot-Seite bleibt er in jedem Fall erreichbar.
//
// Nicht auf /map: dort sitzt unten rechts der Standort-Knopf, der an der Kante
// der Liste mitwandert (MapControls .fab, `--locate-bottom` pro Frame). Zwei
// Knöpfe übereinander an einer wandernden Kante ist eine eigene Entscheidung —
// Remy gehört dort eher in die Such-Leiste als in die Ecke.

import { useCallback, useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import { CloseIcon } from '@/app/components/map/icons';
import { preloadBuddyWidget } from './RemyDock';
import styles from './RemyLauncher.module.css';

const DISMISS_KEY = 'buddyLauncherHidden';

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
  const [hidden, setHidden] = useState(readDismissed);

  const dismiss = useCallback(() => {
    setHidden(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Gesperrter Speicher: dann gilt es nur für diese Seite. Immer noch
      // besser als ein Knopf, der sich nicht wegtippen lässt.
    }
  }, []);

  if (hidden) return null;
  if (pathname === '/map' || pathname.startsWith('/map/')) return null;

  const label = locale === 'en' ? 'Ask Remy' : 'Frag Remy';
  const hide = locale === 'en' ? 'Hide Remy' : 'Remy ausblenden';
  return (
    <div className={styles.dock}>
      <button
        type="button"
        className={styles.launcher}
        data-buddy-launcher=""
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-controls="buddy-panel"
        onPointerEnter={() => void preloadBuddyWidget()}
        onFocus={() => void preloadBuddyWidget()}
        onClick={() => dispatchBuddyAsk()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.face}
          src="/buddy/buddy-smile.webp"
          alt=""
          width={116}
          height={116}
        />
      </button>
      {/* Eigener Knopf neben dem großen, nicht darin: ein <button> im <button>
          ist kein gültiges Markup. */}
      <button
        type="button"
        className={styles.dismiss}
        data-buddy-launcher-dismiss=""
        aria-label={hide}
        title={hide}
        onClick={dismiss}
      >
        <CloseIcon />
      </button>
    </div>
  );
}
