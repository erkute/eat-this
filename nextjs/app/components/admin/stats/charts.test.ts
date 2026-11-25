import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Kpi, ticks } from './charts';

describe('ticks', () => {
  it('reicht immer bis über das Maximum', () => {
    expect(ticks(61)).toEqual([0, 20, 40, 60, 80]);
    expect(ticks(162)).toEqual([0, 50, 100, 150, 200]);
    expect(ticks(60)).toEqual([0, 20, 40, 60]);
  });

  it('bleibt bei Zählwerten ganzzahlig', () => {
    expect(ticks(1, 1)).toEqual([0, 1]);
    expect(ticks(3, 1)).toEqual([0, 1, 2, 3]);
  });

  it('teilt ohne Mindestschritt auch fein', () => {
    expect(ticks(1)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});

describe('Kpi', () => {
  it.each([
    { change: -0.2, invert: true, text: 'Verbessert (−20,0\u00a0%)' },
    { change: 0.2, invert: true, text: 'Verschlechtert (+20,0\u00a0%)' },
    { change: 0.2, invert: false, text: 'Verbessert (+20,0\u00a0%)' },
    { change: -0.2, invert: false, text: 'Verschlechtert (−20,0\u00a0%)' },
    { change: 0, invert: true, text: 'Unverändert (0,0\u00a0%)' },
    { change: -0.003, invert: true, text: 'Nahezu unverändert (−0,3\u00a0%)' },
    { change: null, invert: false, text: 'Kein Vergleich' },
  ])('zeigt $text für $change (invert $invert)', ({ change, invert, text }) => {
    const before = change === null ? 0 : 10;
    const now = change === null ? 10 : before * (1 + change);
    const markup = renderToStaticMarkup(createElement(Kpi, {
      label: 'Kennzahl',
      value: String(now),
      delta: { now, before, change },
      invert,
    }));
    expect(markup).toContain(`>${text}</span>`);
  });

  it('unterscheidet einen fehlenden Vergleich von einem Einzelwert', () => {
    const props = { label: 'Kennzahl', value: '8' };
    expect(renderToStaticMarkup(createElement(Kpi, { ...props, delta: null })))
      .toContain('>Kein Vergleich</span>');
    expect(renderToStaticMarkup(createElement(Kpi, props))).not.toContain('Kein Vergleich');
  });
});
