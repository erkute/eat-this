'use client';

// Remys Anlegestelle — der EINE Mount für die ganze Site.
//
// Sie lädt zunächst nichts: kein Chat, kein Chunk, nur ein Knopf und ein
// Listener. Erst das erste BUDDY_ASK_EVENT holt das Widget (~108 KB:
// Streaming, Nachrichten-Rendering, die Buddy-Hooks). Die Frage, die den Mount
// auslöst, puffert homeStage (pendingBuddyAsk) — sie überlebt das Nachladen.
//
// Auf der Startseite wird der Chunk vorgeladen, sobald der Browser Luft hat:
// dort steht Remys Bühne mitten auf der Seite und wird auch angetippt. Auf den
// redaktionellen Seiten zahlt niemand dafür, der ihn nicht anspricht.
//
// Providers (Auth/LoginModal/UserLocation) kommen vom umgebenden Layout — jedes
// Layout, das diese Anlegestelle rendert, hat denselben Stapel.

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from '@/i18n/navigation';
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage';
import RemyLauncher from './RemyLauncher';

export const preloadBuddyWidget = () => import('./BuddyWidget');
const BuddyWidget = dynamic(preloadBuddyWidget, { ssr: false });

export default function RemyDock({ pageSlug }: { pageSlug?: string } = {}) {
  const [mount, setMount] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  useEffect(() => {
    if (mount) return;
    const onAsk = () => setMount(true);
    window.addEventListener(BUDDY_ASK_EVENT, onAsk);
    if (!isHome) return () => window.removeEventListener(BUDDY_ASK_EVENT, onAsk);

    // Safari hatte historisch kein requestIdleCallback — zur Laufzeit prüfen,
    // auch wenn lib.dom es als vorhanden typt, und sonst kurz timen.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => void preloadBuddyWidget(), { timeout: 3000 });
      return () => {
        window.removeEventListener(BUDDY_ASK_EVENT, onAsk);
        window.cancelIdleCallback(id);
      };
    }
    const t = setTimeout(() => void preloadBuddyWidget(), 1500);
    return () => {
      window.removeEventListener(BUDDY_ASK_EVENT, onAsk);
      clearTimeout(t);
    };
  }, [mount, isHome]);

  return (
    <>
      <RemyLauncher />
      {mount && <BuddyWidget pageSlug={pageSlug} />}
    </>
  );
}
