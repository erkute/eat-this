// @vitest-environment jsdom
// nextjs/app/components/buddy/BuddyWidget.dismiss.test.tsx
//
// Wegtippen darf NIE auf der Ebene darunter ankommen.
//
// Remys Panel schloss auf einem `pointerdown` an `document` — ungesichert.
// Damit war es weg, bevor der Klick kam, und der Klick traf, was darunter lag.
// Auf dem Telefon ist das die Regel, nicht der Ausnahmefall: touchstart,
// touchend, und erst danach der Klick. Remy haengt in der SPA-Huelle und auf
// den Restaurantseiten, das galt also fast ueberall.
//
// Jetzt nimmt der Vorhang den Klick selbst an. Diese Tests nageln beide
// Haelften fest: der Vorhang schliesst auf `click`, und ein blosses
// `pointerdown` schliesst NICHT — genau das war das Loch.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { BUDDY_ASK_EVENT, consumePendingBuddyAsk } from '@/lib/buddy/homeStage';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/map/useFavorites', () => ({
  useFavorites: () => ({ favoriteIds: new Set<string>(), toggle: vi.fn() }),
}));
vi.mock('./useBuddyChat', () => ({
  useBuddyChat: () => ({ messages: [], isStreaming: false, send: vi.fn(), setGeo: vi.fn() }),
}));
vi.mock('@/lib/map/UserLocationContext', () => ({
  useUserLocationContext: () => ({ location: null, loading: false, error: null, request: vi.fn() }),
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

import BuddyWidget from './BuddyWidget';

afterEach(() => {
  cleanup();
  consumePendingBuddyAsk();
});

function oeffneRemy() {
  render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <BuddyWidget />
    </NextIntlClientProvider>
  );
  fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }));
  const panel = document.querySelector('[data-buddy-panel="open"]');
  expect(panel).not.toBeNull();
  const scrim = document.querySelector('[aria-hidden="true"]');
  expect(scrim).not.toBeNull();
  return { scrim: scrim as HTMLElement };
}

const offen = () => document.querySelector('[data-buddy-panel="open"]') !== null;

describe('Remy wegtippen', () => {
  it('schliesst, wenn der Vorhang geklickt wird', () => {
    const { scrim } = oeffneRemy();
    fireEvent.click(scrim);
    expect(offen()).toBe(false);
  });

  it('schliesst NICHT schon beim Aufsetzen des Fingers', () => {
    // Der Kern der Sache: solange der Finger nur aufliegt, muss das Panel
    // stehen bleiben. Verschwaende es hier, waere der Vorhang beim Eintreffen
    // des Klicks nicht mehr da — und der Klick landete auf der Seite darunter.
    const { scrim } = oeffneRemy();
    fireEvent.pointerDown(scrim);
    fireEvent.mouseDown(scrim);
    fireEvent.touchStart(scrim);
    expect(offen()).toBe(true);
  });

  it('laesst einen Klick im Panel in Ruhe', () => {
    oeffneRemy();
    const panel = document.querySelector('[data-buddy-panel="open"]') as HTMLElement;
    fireEvent.click(panel);
    expect(offen()).toBe(true);
  });
});
