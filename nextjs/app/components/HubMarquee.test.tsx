import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HubMarquee from './HubMarquee';

describe('HubMarquee', () => {
  it('bleibt für Screenreader Deko', () => {
    // Der Claim steht oben schon als Headline — vorgelesen wäre das Band ein
    // Echo in Endlosschleife.
    const html = renderToStaticMarkup(<HubMarquee />);
    expect(html).toMatch(/^<section[^>]+aria-hidden="true"/);
  });

  it('trägt nur den Claim, und den doppelt, damit die Schleife bei -50 % nahtlos ist', () => {
    const html = renderToStaticMarkup(<HubMarquee />);
    expect(html.match(/We tell you what to eat/g)).toHaveLength(6);
    expect(html).not.toMatch(/Berlin Food Map|Must Eats|Spot des Tages|Hidden Gems/);
  });
});
