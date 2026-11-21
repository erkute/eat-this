// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  countVital: vi.fn(),
  report: null as null | ((metric: { name: string; value: number }) => void),
}));
vi.mock('next/web-vitals', () => ({
  useReportWebVitals: (fn: (metric: { name: string; value: number }) => void) => {
    mocks.report = fn;
  },
}));
vi.mock('@/lib/analytics', () => ({ countVital: mocks.countVital }));

window.history.replaceState(null, '', '/restaurant/crapulix');
const { default: WebVitalsReporter } = await import('./WebVitalsReporter');

it('meldet LCP, INP und CLS mit dem Pfad, auf dem das Dokument geöffnet wurde', () => {
  render(<WebVitalsReporter />);
  window.history.replaceState(null, '', '/map');
  mocks.report?.({ name: 'LCP', value: 1800 });
  mocks.report?.({ name: 'CLS', value: 0.02 });
  mocks.report?.({ name: 'TTFB', value: 300 });
  mocks.report?.({ name: 'FCP', value: 900 });
  expect(mocks.countVital.mock.calls).toEqual([
    ['LCP', 1800, '/restaurant/crapulix'],
    ['CLS', 0.02, '/restaurant/crapulix'],
  ]);
});
