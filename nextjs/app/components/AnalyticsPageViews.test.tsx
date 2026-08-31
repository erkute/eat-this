// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pathname: '/map',
  search: '',
  countView: vi.fn(),
  loadAnalytics: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock('@/lib/analytics', () => ({
  countView: mocks.countView,
  loadAnalytics: mocks.loadAnalytics,
  trackEvent: mocks.trackEvent,
  getAnalyticsPageLocation: (href: string) => ({ pageLocation: href, pagePath: mocks.pathname }),
}));

import AnalyticsPageViews from './AnalyticsPageViews';

/** Die Karte schreibt ihre Filter per History-API — der Pfad bleibt, die
 *  Query wechselt. Genau das darf keinen Seitenaufruf erzeugen. */
function setUrl(pathname: string, search: string) {
  mocks.pathname = pathname;
  mocks.search = search;
  window.history.replaceState({}, '', `${pathname}${search}`);
}

describe('AnalyticsPageViews', () => {
  beforeEach(() => {
    mocks.countView.mockReset();
    mocks.trackEvent.mockReset();
    mocks.loadAnalytics.mockReset();
    setUrl('/map', '');
  });

  afterEach(cleanup);

  it('zählt den ersten Aufruf', () => {
    render(<AnalyticsPageViews />);

    expect(mocks.countView).toHaveBeenCalledTimes(1);
    expect(mocks.trackEvent).toHaveBeenCalledWith('page_view', expect.anything());
  });

  it('zählt einen Wechsel der Seite', () => {
    const view = render(<AnalyticsPageViews />);
    expect(mocks.countView).toHaveBeenCalledTimes(1);

    setUrl('/must-eats', '');
    view.rerender(<AnalyticsPageViews />);

    expect(mocks.countView).toHaveBeenCalledTimes(2);
  });

  it('zählt einen Filterwechsel NICHT als Seitenaufruf', () => {
    // Der Regressionstest zum Befund vom 31.08.2026: hing der Effekt an
    // useSearchParams, erzeugte jeder Tipp auf einen Karten-Filter einen
    // eigenen „Seitenaufruf" — auf derselben Seite.
    const view = render(<AnalyticsPageViews />);
    expect(mocks.countView).toHaveBeenCalledTimes(1);

    setUrl('/map', '?category=pizza');
    view.rerender(<AnalyticsPageViews />);
    setUrl('/map', '?category=pizza&price=20');
    view.rerender(<AnalyticsPageViews />);
    setUrl('/map', '?category=coffee&price=20&bezirk=mitte');
    view.rerender(<AnalyticsPageViews />);

    expect(mocks.countView).toHaveBeenCalledTimes(1);
    expect(mocks.trackEvent).toHaveBeenCalledTimes(1);
  });

  it('zählt wieder, sobald der Pfad nach Filterwechseln wirklich wechselt', () => {
    const view = render(<AnalyticsPageViews />);

    setUrl('/map', '?category=pizza');
    view.rerender(<AnalyticsPageViews />);
    setUrl('/restaurant/barra', '');
    view.rerender(<AnalyticsPageViews />);

    expect(mocks.countView).toHaveBeenCalledTimes(2);
  });
});
