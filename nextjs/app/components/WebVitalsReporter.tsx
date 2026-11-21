'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { countVital } from '@/lib/analytics';
import { VITAL_METRICS, type VitalMetric } from '@/lib/analytics/webVitals';

/*
 * Echte Ladezeiten über den eigenen Zähler (lib/analytics/webVitals.ts).
 *
 * Der Seitentyp ist der des frisch geladenen Dokuments: LCP misst nur ihn, und
 * CLS und INP kommen erst beim Verlassen, wenn die App längst eine andere Seite
 * zeigen kann. Modulweit gemerkt, weil das genau die Lebensdauer eines
 * Dokuments ist.
 */
const landingPath = typeof window === 'undefined' ? '' : window.location.pathname;

export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (!VITAL_METRICS.includes(metric.name as VitalMetric)) return;
    countVital(metric.name, metric.value, landingPath);
  });
  return null;
}
