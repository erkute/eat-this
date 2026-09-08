// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage';

const widgetProps = vi.hoisted(() => ({ last: null as { pageSlug?: string } | null }));
const route = vi.hoisted(() => ({ pathname: '/kategorie/pizza' }));

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockBuddyWidget(props: { pageSlug?: string }) {
      widgetProps.last = props;
      return <div data-testid="buddy-widget" />;
    },
}));

vi.mock('./BuddyWidget', () => ({ default: () => null }));
vi.mock('@/i18n/navigation', () => ({ usePathname: () => route.pathname }));

import RemyDock from './RemyDock';

function renderDock(pageSlug?: string) {
  return render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <RemyDock pageSlug={pageSlug} />
    </NextIntlClientProvider>
  );
}

const launcher = () => document.querySelector('[data-buddy-launcher]');

afterEach(() => {
  cleanup();
  widgetProps.last = null;
  route.pathname = '/kategorie/pizza';
});

describe('RemyDock', () => {
  it('mounts nothing but the launcher until someone asks — the SEO page pays only for the listener', () => {
    const { queryByTestId } = renderDock('bari');
    expect(queryByTestId('buddy-widget')).toBeNull();
    expect(launcher()).not.toBeNull();
  });

  it('mounts the widget with the page slug on the first ask event', () => {
    const { queryByTestId } = renderDock('bari');

    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: { question: 'Was hier?' } }));

    expect(queryByTestId('buddy-widget')).not.toBeNull();
    expect(widgetProps.last).toEqual({ pageSlug: 'bari' });
  });

  it('opens the chat from the launcher', () => {
    const { queryByTestId } = renderDock();
    fireEvent.click(launcher()!);
    expect(queryByTestId('buddy-widget')).not.toBeNull();
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
