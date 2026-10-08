// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage';

const route = vi.hoisted(() => ({ pathname: '/kategorie/pizza' }));

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockBuddyWidget() {
      return <div data-testid="buddy-widget" />;
    },
}));

vi.mock('./BuddyWidget', () => ({ default: () => null }));
vi.mock('@/i18n/navigation', () => ({ usePathname: () => route.pathname }));

import RemyDock from './RemyDock';

function renderDock() {
  return render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <RemyDock />
    </NextIntlClientProvider>
  );
}

const launcher = () => document.querySelector('[data-buddy-launcher]');
const dismiss = () => document.querySelector<HTMLButtonElement>('[data-buddy-launcher-dismiss]');

afterEach(() => {
  cleanup();
  route.pathname = '/kategorie/pizza';
  window.sessionStorage.clear();
  document.documentElement.removeAttribute('data-hero-intro');
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('RemyDock', () => {
  it('keeps the home entrance waiting until its face is loaded, even after the intro', async () => {
    route.pathname = '/';
    renderDock();
    const dock = launcher()!.parentElement!;
    expect(dock.dataset.entrance).toBe('waiting');

    await act(async () => { fireEvent.load(launcher()!.querySelector('img')!); });
    expect(dock.dataset.entrance).toBe('playing');
  });

  it('waits for both the face and the hero before playing the home entrance', async () => {
    route.pathname = '/';
    document.documentElement.setAttribute('data-hero-intro', '');
    renderDock();
    await act(async () => { fireEvent.load(launcher()!.querySelector('img')!); });
    expect(launcher()!.parentElement!.dataset.entrance).toBe('waiting');
    await act(async () => { document.documentElement.removeAttribute('data-hero-intro'); });
    expect(launcher()!.parentElement!.dataset.entrance).toBe('playing');
  });

  it('shows the home launcher immediately without motion when reduced motion is requested', () => {
    route.pathname = '/';
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    renderDock();
    expect(launcher()!.parentElement!.dataset.entrance).toBeUndefined();
  });

  it('mounts nothing but the launcher until someone asks — the SEO page pays only for the listener', () => {
    const { queryByTestId } = renderDock();
    expect(queryByTestId('buddy-widget')).toBeNull();
    expect(launcher()).not.toBeNull();
  });

  it('mounts the widget on the first ask event', () => {
    const { queryByTestId } = renderDock();

    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: { question: 'Was gibt es?' } }));

    expect(queryByTestId('buddy-widget')).not.toBeNull();
  });

  it('opens the chat from the launcher', () => {
    const { queryByTestId } = renderDock();
    fireEvent.click(launcher()!);
    expect(queryByTestId('buddy-widget')).not.toBeNull();
  });

  /* Wer ihn nicht will, tippt ihn weg — für diesen Besuch. Nicht für immer:
     ein dauerhaft weggeklickter Remy wäre nicht mehr auffindbar. */
  it('lets the visitor put the launcher away for this visit', () => {
    vi.useFakeTimers();
    renderDock();
    expect(launcher()).not.toBeNull();

    fireEvent.click(dismiss()!);
    expect(launcher()).not.toBeNull();
    expect(dismiss()!.disabled).toBe(true);
    expect(window.sessionStorage.getItem('buddyLauncherHidden')).toBe('1');
    act(() => vi.advanceTimersByTime(1000));
    expect(launcher()).toBeNull();

    // Auch nach dem Seitenwechsel bleibt er weg — und der Chat selbst bleibt
    // trotzdem erreichbar (Bühne der Startseite).
    cleanup();
    const { queryByTestId } = renderDock();
    expect(launcher()).toBeNull();

    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }));
    expect(queryByTestId('buddy-widget')).not.toBeNull();
  });

  it('dismisses immediately when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    renderDock();
    fireEvent.click(dismiss()!);
    expect(launcher()).toBeNull();
    expect(window.sessionStorage.getItem('buddyLauncherHidden')).toBe('1');
  });

  /* Unten rechts sitzt auf der Map der Standort-Knopf, der an der Kante der
     Liste mitwandert (MapControls .fab). Zwei Knöpfe übereinander an einer
     wandernden Kante ist eine eigene Entscheidung — Remy gehört dort eher in
     die Such-Leiste. Die Anlegestelle selbst bleibt, der Chat ist also über
     die Karten-UI weiterhin erreichbar, sobald sie ihn anbietet. */
  it('keeps the launcher off the map', () => {
    route.pathname = '/map';
    const { queryByTestId } = renderDock();
    expect(launcher()).toBeNull();
    expect(queryByTestId('buddy-widget')).toBeNull();

    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }));
    expect(queryByTestId('buddy-widget')).not.toBeNull();
  });
});

/* In Magazin-Artikeln wird gelesen — kein Knopf über dem Text (Ansage
   02.10.2026). Die Übersicht behält ihn. */
it.each(['/news/bestes-croissant-berlin', '/news/vorschau/abc'])(
  'keeps the launcher out of the article %s',
  (pathname) => {
    route.pathname = pathname;
    renderDock();
    expect(launcher()).toBeNull();
  }
);

it('keeps the launcher on the magazine index', () => {
  route.pathname = '/news';
  renderDock();
  expect(launcher()).not.toBeNull();
});

it.each(['/packs', '/pack/pizza', '/pack/coffee'])(
  'keeps purchase controls clear on %s',
  (pathname) => {
    route.pathname = pathname;
    renderDock();
    expect(launcher()).toBeNull();
  }
);
