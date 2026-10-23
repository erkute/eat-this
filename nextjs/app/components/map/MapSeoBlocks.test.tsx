import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MapIntro from './MapIntro';
import { getMapSeoCopy } from '@/lib/map/mapSeoCopy';

const intro = (locale: string) => renderToStaticMarkup(<MapIntro locale={locale} />);

describe('MapIntro', () => {
  it('carries the page H1, exactly once, in both locales', () => {
    for (const locale of ['de', 'en']) {
      const html = intro(locale);
      expect(html.match(/<h1/g)).toHaveLength(1);
      expect(html).toContain(getMapSeoCopy(locale).h1);
    }
  });

  it('carries the title and nothing else — no subtitle over the map', () => {
    // Die Zeile unter dem Titel stand am 01.09.2026 kurz hier und flog auf
    // Wunsch wieder raus: über der Karte soll nur die Marke stehen. Ihre
    // Begriffe trägt die Meta-Description.
    expect(intro('de')).not.toContain('<p');
    // Der Name ist in beiden Sprachen derselbe, also auch das Markup.
    expect(intro('de')).toBe(intro('en'));
  });

  it('renders server-side, so the H1 needs no JavaScript to be read', () => {
    expect(intro('de')).toContain('<h1');
    expect(intro('de')).toContain('Berlin Food Map');
  });

  it('falls back to German for a locale segment the middleware never mapped', () => {
    expect(intro('sitemap.xml')).toContain(getMapSeoCopy('de').h1);
  });
});

describe('map page H1 wiring', () => {
  const read = (name: string) =>
    readFileSync(fileURLToPath(new URL(`./${name}`, import.meta.url)), 'utf8');
  const body = read('MapSectionBody.tsx');

  it('floats MapIntro over the map', () => {
    // MapIntro steht zwischen `.mapWrap` und der Live-Karten-Ebene, also in
    // der Kartenfläche und außerhalb des Sheets — damit rendert die H1 in
    // jedem Zustand, auch im Detail, und kostet der Liste keinen Pixel.
    const mapWrap = body.indexOf('className={styles.mapWrap}');
    const liveLayer = body.indexOf('className={styles.liveMapLayer}');
    const intro = body.indexOf('<MapIntro');
    expect(intro).toBeGreaterThan(mapWrap);
    expect(intro).toBeLessThan(liveLayer);
  });

  it('keeps exactly one h1 across the whole map subsystem', () => {
    // Die Detail-Panels tragen h2: die Seite ist /map, das Detail ein Panel
    // darin. Standen sie auf h1, hatte die Karte im Detail-Zustand zwei.
    const withH1 = [
      'MapSectionBody.tsx',
      'RestaurantDetail.tsx',
      'MustEatDetailMobile.tsx',
      'MustEatDetail.tsx',
      'MapSheetDetail.tsx',
      'RestaurantList.tsx',
    ].filter((name) => read(name).includes('<h1'));
    expect(withH1).toEqual([]);
  });
});
