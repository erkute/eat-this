import { it, expect } from 'vitest';
import { summarize } from './stats.server';
import { dashboardFindings } from './dashboardFindings';
it('bewertet kleine Stichproben nicht als Abbruchproblem', () => {
  const data = summarize([
    {
      day: '2026-11-01',
      visitors: 1,
      pageviews: 1,
      paths: { '/news/test': 1 },
      entryPaths: { '/news/test': 1 },
      continuations: {},
    },
  ]);
  expect(dashboardFindings(data)).toEqual([]);
});
it('beschreibt große Ausstiege als Schätzung statt als fehlerhafte Personen-Conversion', () => {
  const data = summarize([
    {
      day: '2026-11-01',
      visitors: 30,
      pageviews: 30,
      paths: { '/news/test': 30 },
      entryPaths: { '/news/test': 30 },
      continuations: { '/news/test': 2 },
    },
  ]);
  const finding = dashboardFindings(data)[0];
  expect(finding.title).toContain('/news/test');
  expect(finding.detail).toContain('geschätzt');
  expect(finding.detail).toContain('Frage beantwortet');
});

it('flags uncorroborated traffic without claiming a bot count', () => {
  const data = summarize([
    {
      day: '2026-11-03',
      visitors: 206,
      pageviews: 384,
      events: { consent_gate_shown: 311, consent_accepted: 18, consent_declined: 9 },
    },
  ]);
  const finding = dashboardFindings(data).find((row) => row.key === 'traffic-quality');
  expect(finding?.detail).toContain('311');
  expect(finding?.detail).toContain('27 Antworten');
  expect(finding?.detail).toContain('Kein Botnachweis');
});
