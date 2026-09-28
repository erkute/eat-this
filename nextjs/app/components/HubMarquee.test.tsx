import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HubMarquee from './HubMarquee';

describe('HubMarquee', () => {
  it('bleibt für Screenreader Deko', () => {
    // Dieselben Wörter stehen gleich darunter als echte Überschriften —
    // vorgelesen wären sie ein Echo in Endlosschleife.
    const html = renderToStaticMarkup(<HubMarquee locale="de" />);
    expect(html).toMatch(/^<section[^>]+aria-hidden="true"/);
  });

  it('trägt jeden Lauf doppelt, damit die Schleife bei -50 % nahtlos ist', () => {
    const html = renderToStaticMarkup(<HubMarquee locale="en" />);
    expect(html.match(/Spot of the day/g)).toHaveLength(2);
    expect(html.match(/We tell you what to eat/g)).toHaveLength(6);
  });
});
