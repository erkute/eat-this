// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
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

afterEach(() => {
  cleanup();
  route.pathname = '/kategorie/pizza';
  window.sessionStorage.clear();
  document.documentElement.removeAttribute('data-hero-intro');
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('RemyDock', () => {
  it('mounts nothing until someone asks — the SEO page pays only for the listener', () => {
    const { container, queryByTestId } = renderDock();
    expect(queryByTestId('buddy-widget')).toBeNull();
    expect(container.innerHTML).toBe('');
  });

  it('mounts the widget on the first ask event', () => {
    const { queryByTestId } = renderDock();

    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: { question: 'Was gibt es?' } }));

    expect(queryByTestId('buddy-widget')).not.toBeNull();
  });

  /* Remy hat keinen Knopf in der Ecke mehr (Ansage 21.10.2026), auf keiner
     Seite — gefragt wird über das Menü. */
  it.each(['/', '/news', '/map', '/packs'])('shows no corner launcher on %s', (pathname) => {
    route.pathname = pathname;
    renderDock();
    expect(document.querySelector('[data-buddy-launcher]')).toBeNull();
  });
});
