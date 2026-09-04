// @vitest-environment jsdom
// nextjs/app/components/buddy/BuddyWidget.stage.test.tsx
// Remy opens from the home hub via buddy:ask. There is no floating launcher.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { BUDDY_ASK_EVENT, consumePendingBuddyAsk, dispatchBuddyAsk } from '@/lib/buddy/homeStage';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/map/useFavorites', () => ({
  useFavorites: () => ({ favoriteIds: new Set<string>(), toggle: vi.fn() }),
}));
const { send, setGeo, locationState } = vi.hoisted(() => ({
  send: vi.fn(),
  setGeo: vi.fn(),
  locationState: {
    location: null as { lat: number; lng: number } | null,
    loading: false,
    request: vi.fn(),
  },
}));
vi.mock('./useBuddyChat', () => ({
  useBuddyChat: () => ({ messages: [], isStreaming: false, send, setGeo }),
}));
vi.mock('@/lib/map/UserLocationContext', () => ({
  useUserLocationContext: () => ({
    location: locationState.location,
    loading: locationState.loading,
    error: null,
    request: locationState.request,
  }),
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

import BuddyWidget from './BuddyWidget';

afterEach(() => {
  cleanup();
  send.mockClear();
  setGeo.mockClear();
  locationState.location = null;
  locationState.loading = false;
  locationState.request = vi.fn();
  consumePendingBuddyAsk();
});

function renderWidget() {
  return render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <BuddyWidget />
    </NextIntlClientProvider>
  );
}

describe('BuddyWidget home ask protocol', () => {
  it('does not render a floating launcher', () => {
    renderWidget();
    expect(document.querySelector('[data-buddy-launcher]')).toBeNull();
  });

  it('opens the panel and sends the question on buddy:ask', () => {
    renderWidget();
    expect(document.querySelector('[data-buddy-panel="open"]')).toBeNull();

    fireEvent(
      window,
      new CustomEvent(BUDDY_ASK_EVENT, { detail: { question: 'Wo gibt’s gute Pizza?' } })
    );
    expect(document.querySelector('[data-buddy-panel="open"]')).not.toBeNull();
    expect(send).toHaveBeenCalledWith('Wo gibt’s gute Pizza?');
  });

  it('replays an ask dispatched before the lazy widget finishes mounting', () => {
    dispatchBuddyAsk({ question: 'Wo gibt’s gute Pizza?' });

    renderWidget();

    expect(document.querySelector('[data-buddy-panel="open"]')).not.toBeNull();
    expect(send).toHaveBeenCalledWith('Wo gibt’s gute Pizza?');
  });

  it('uses the shared location for nearby questions from the stage', () => {
    const steglitz = { lat: 52.456, lng: 13.322 };
    locationState.location = steglitz;
    renderWidget();

    fireEvent(
      window,
      new CustomEvent(BUDDY_ASK_EVENT, { detail: { question: 'Guter Kaffee in meiner Nähe?' } })
    );

    expect(setGeo).toHaveBeenCalledWith(steglitz);
    expect(locationState.request).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith('Guter Kaffee in meiner Nähe?');
  });

  it('opens the panel without sending when buddy:ask has no question', () => {
    renderWidget();
    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }));
    expect(document.querySelector('[data-buddy-panel="open"]')).not.toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  /* Frueher stand hier „closes the panel on pointerdown outside". Genau das
     war der Fehler: auf dem Telefon kommt der Klick erst NACH dem Finger, und
     bis dahin war das Panel weg — der Klick traf dann, was darunter lag.
     Geschlossen wird jetzt vom Vorhang, per Klick. Die Faelle im Detail
     stehen in BuddyWidget.dismiss.test.tsx. */
  it('bleibt offen, solange der Finger nur aufliegt', () => {
    renderWidget();
    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }));
    const panel = document.querySelector('[data-buddy-panel="open"]')!;

    fireEvent.pointerDown(panel);
    expect(document.querySelector('[data-buddy-panel="open"]')).not.toBeNull();

    fireEvent.pointerDown(document.body);
    expect(document.querySelector('[data-buddy-panel="open"]')).not.toBeNull();
  });
});
