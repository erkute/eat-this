'use client';
import { translations, type Lang } from '@/lib/i18n/translations';
import type { LoginIntent } from './loginContinueUrl';
import { rememberPendingStarterCard } from './pendingStarterCard';

/**
 * Die Starter-Pack-Tafel für einen Gast, der auf einen Kartenrücken tippt.
 *
 * Als LAYER über der Seite, nicht als Block in der Karte (Betreiber,
 * 07.09.2026: „Der Banner mit dem Starter Pack sollte als Layer nach einem
 * Klick kommen auf die verdeckte Karte"). Der Rücken bleibt, was er überall
 * ist — „Noch nicht aufgedeckt" —, und erst der Tipp sagt, wie man an die
 * Karte kommt: gratis anmelden, zwanzig Must Eats, diese dabei.
 *
 * Läuft durch die zentrale Info-Karte (NotificationToast, `layer: true`), wie
 * jede Meldung der Seite: derselbe Scrim, dieselbe Karte, „Alles klar" und
 * der gelbe Knopf. Der Knopf öffnet das Login im Starter-Pack-Modus; die
 * angetippte Karte reist als Absicht mit (pendingStarterCard), damit das
 * Pack sie garantiert offen enthält.
 */
export function showStarterPitch({
  mustEatId,
  lang,
  openLoginModal,
}: {
  mustEatId: string;
  lang: Lang;
  openLoginModal: (mode: 'starter', intent: LoginIntent) => void;
}): void {
  const copy = translations[lang].map;
  window.showNotice?.({
    tone: 'info',
    icon: 'spark',
    eyebrow: copy.guestPitchKicker,
    title: copy.guestPitchTitle,
    detail: copy.guestPitchBody,
    action: {
      label: copy.guestPitchCta,
      onClick: () => {
        rememberPendingStarterCard(mustEatId);
        openLoginModal('starter', { starterMustEatId: mustEatId });
      },
    },
    onDismiss: () => {},
    duration: 0,
    layer: true,
  });
}
