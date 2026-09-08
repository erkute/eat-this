'use client';

// Der dauerhafte Weg zu Remy, auf jeder Seite unten rechts.
//
// Er lädt NICHTS von der Chat-Maschinerie: der Knopf schickt nur ein
// BUDDY_ASK_EVENT, RemyDock mountet das Widget beim ersten. Hover/Fokus wärmt
// den Chunk vor, damit das Panel beim Tap schon da ist.
//
// Nicht auf /map: dort sitzt unten rechts der Standort-Knopf, der an der Kante
// der Liste mitwandert (MapControls .fab, `--locate-bottom` pro Frame). Zwei
// Knöpfe übereinander an einer wandernden Kante ist eine eigene Entscheidung —
// Remy gehört dort eher in die Such-Leiste als in die Ecke.

import { useLocale } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import { preloadBuddyWidget } from './RemyDock';
import styles from './RemyLauncher.module.css';

export default function RemyLauncher() {
  const pathname = usePathname();
  const locale = useLocale();
  if (pathname === '/map' || pathname.startsWith('/map/')) return null;

  const label = locale === 'en' ? 'Ask Remy' : 'Frag Remy';
  return (
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
      <img className={styles.face} src="/buddy/buddy-smile.webp" alt="" width={116} height={116} />
    </button>
  );
}
