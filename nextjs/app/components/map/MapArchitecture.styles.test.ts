import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const moduleNames = [
  'MapLayout.module.css',
  'MapSheet.module.css',
  'MapControls.module.css',
  'MapMarkers.module.css',
  'MapDetails.module.css',
  'MapFilters.module.css',
  'MapListEmpty.module.css',
  'RestaurantList.module.css',
  'RestaurantGalleryLightbox.module.css',
  'MustEatImageLightbox.module.css',
  'MustEatRevealOverlay.module.css',
] as const;

function modulePath(name: string) {
  return fileURLToPath(new URL(`./${name}`, import.meta.url));
}

function localClasses(name: string) {
  const root = postcss.parse(readFileSync(modulePath(name), 'utf8'));
  const classes = new Set<string>();
  root.walkRules((rule) => {
    const localSelector = rule.selector.replaceAll(/:global\([^)]*\)/g, '');
    for (const match of localSelector.matchAll(/\.([A-Za-z_][\w-]*)/g)) {
      if (!match[1].startsWith('maplibregl-')) classes.add(match[1]);
    }
  });
  return [...classes].sort();
}

function declarationsInMedia(name: string, selector: string, mediaParams: string) {
  const root = postcss.parse(readFileSync(modulePath(name), 'utf8'));
  const matches: Record<string, string>[] = [];

  root.walkRules((rule) => {
    if (rule.selector !== selector) return;
    const parent = rule.parent;
    if (parent?.type !== 'atrule' || parent.name !== 'media' || parent.params !== mediaParams) {
      return;
    }

    const declarations: Record<string, string> = {};
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
    });
    matches.push(declarations);
  });

  return matches;
}

describe('Map CSS architecture', () => {
  it('keeps every map module free of !important', () => {
    const important: string[] = [];

    for (const name of moduleNames) {
      const root = postcss.parse(readFileSync(modulePath(name), 'utf8'));
      root.walkDecls((declaration) => {
        if (declaration.important) important.push(`${name}: ${declaration.prop}`);
      });
    }

    expect(important).toEqual([]);
  });

  it('keeps the former monolith split by responsibility', () => {
    expect(existsSync(modulePath('map.module.css'))).toBe(false);
    expect(localClasses('MapLayout.module.css')).toEqual([
      'body',
      'liveMapLayer',
      'mapLoading',
      'mapWrap',
      'shell',
      'srOnly',
    ]);
    expect(localClasses('MapSheet.module.css')).toEqual([
      'handle',
      'list',
      'listScroll',
      'stuckSentinel',
    ]);
    expect(localClasses('MapMarkers.module.css')).toEqual([
      'markerRoot',
      'pinLogo',
      'pinLogoActive',
      'pinLogoHasMust',
      'pinLogoShape',
      'userLoc',
      'userLocAvatar',
    ]);
  });

  it('uses stable data contracts between layout, sheet and controls', () => {
    const controls = readFileSync(modulePath('MapControls.module.css'), 'utf8');
    const sheet = readFileSync(modulePath('MapSheet.module.css'), 'utf8');

    expect(controls).toContain(':global([data-map-body]');
    expect(sheet).toContain(':global([data-map-body]');
    expect(controls).not.toMatch(/\.body(?:\[|\s|:)/);
    expect(sheet).not.toMatch(/\.(?:body|shell)(?:\[|\s|:)/);
  });

  it('keeps the phone Must Eat takeover in flow for Safari browser chrome', () => {
    const mustEatRules = declarationsInMedia(
      'MapSheet.module.css',
      ".list[data-view='detail'][data-detail-kind='must-eat']",
      '(max-width: 767.98px)'
    );
    const layout = readFileSync(modulePath('MapLayout.module.css'), 'utf8');

    expect(mustEatRules).toEqual([
      expect.objectContaining({
        position: 'relative',
        inset: 'auto',
        width: '100%',
        height: '100dvh',
        'min-height': '100dvh',
        'margin-top': '-100dvh',
        overflow: 'hidden',
      }),
    ]);
    expect(layout).not.toContain("html:has(.shell [data-map-sheet][data-detail-kind='must-eat'])");
  });

  it('keeps the phone detail map live but bounded to the visible peek', () => {
    const section = readFileSync(
      fileURLToPath(new URL('../MapSection.tsx', import.meta.url)),
      'utf8'
    );
    const body = readFileSync(modulePath('MapSectionBody.tsx'), 'utf8');
    const shellRules = declarationsInMedia(
      'MapLayout.module.css',
      '.shell',
      '(max-width: 767.98px)'
    );
    const layoutRules = declarationsInMedia(
      'MapLayout.module.css',
      ".body[data-map-view='detail'][data-detail-kind='restaurant'] .mapWrap",
      '(max-width: 767.98px)'
    );
    const listRules = declarationsInMedia('MapSheet.module.css', '.list', '(max-width: 767.98px)');
    const sheetRules = declarationsInMedia(
      'MapSheet.module.css',
      ".list[data-view='detail']",
      '(max-width: 767.98px)'
    );

    expect(shellRules).toEqual([
      expect.objectContaining({
        '--phone-list-sheet-visible': '28dvh',
        '--detail-map-peek': '50dvh',
      }),
    ]);
    expect(listRules).toEqual([
      expect.objectContaining({
        'margin-top': 'calc(0px - var(--phone-list-sheet-visible, 28dvh))',
        /* The last stop is only reachable if the list is at least a viewport
           tall — see phoneSheetSnaps.ts. */
        'min-height': 'calc(100dvh + var(--map-bar-overhang, 0px))',
      }),
    ]);
    expect(layoutRules).toEqual([
      expect.objectContaining({
        /* Anchored like the list so the sheet uncovers the map instead of
           dragging it off-screen — but bounded in height, so the GL layer
           never becomes the full-viewport compositor that broke Safari's
           bottom-bar backdrop. */
        position: 'sticky',
        top: '0',
        height: 'var(--detail-map-peek)',
        overflow: 'hidden',
      }),
    ]);
    expect(sheetRules).toEqual([
      expect.objectContaining({
        'margin-top': '0',
        'min-height': 'calc(100dvh + var(--map-bar-overhang, 0px))',
      }),
    ]);
    expect(section).not.toContain("mapWrap.style.visibility = 'hidden'");
    expect(section).toMatch(/map\.resize\(\);\s+map\.flyTo\(\{\s+center:/);
    expect(body).toContain("? 'restaurant'");
    expect(body).not.toContain('StaticDetailMapPeek');
  });

  it('leaves the phone status-bar safe area uncapped for scrolling content', () => {
    const sheet = readFileSync(modulePath('MapSheet.module.css'), 'utf8');
    const mapPage = readFileSync(
      fileURLToPath(new URL('../../[locale]/(spa)/map/page.tsx', import.meta.url)),
      'utf8'
    );
    const headerRules = declarationsInMedia(
      'MapFilters.module.css',
      '.listHeader',
      '(max-width: 767.98px)'
    );

    expect(sheet).not.toContain(".list[data-header-stuck='true']::before");
    expect(mapPage).toContain('themeColor: null');
    expect(mapPage).not.toContain("themeColor: '#15120e'");
    /* The inset rides as PADDING on a header pinned to 0, not as an offset.
       Offsetting it leaves a gap above the bar that rows scroll through —
       invisible in a browser tab (inset 0) but obvious once installed to the
       home screen, where the page owns the status-bar band. */
    expect(headerRules).toEqual([
      expect.objectContaining({
        position: 'sticky',
        top: '0',
        'padding-top': 'env(safe-area-inset-top, 0px)',
        background: 'var(--et-home-paper, #fff)',
      }),
    ]);
  });

  it('reserves enough phone height for locked Must Eat proximity copy', () => {
    const lockedMidRules = declarationsInMedia(
      'MapDetails.module.css',
      '.detailV13MustEat .fdMid.fdMidLocked',
      '(max-width: 1023.98px)'
    );

    expect(lockedMidRules).toEqual([
      expect.objectContaining({
        '--me-name-slot': 'clamp(56px, 8dvh, 64px)',
      }),
    ]);
  });

  it('contains only the MapLibre controls that are actually mounted', () => {
    const layout = readFileSync(modulePath('MapLayout.module.css'), 'utf8');
    const controls = readFileSync(modulePath('MapControls.module.css'), 'utf8');

    expect(layout).toContain('maplibregl-canvas');
    expect(layout).toContain('maplibregl-ctrl-attrib');
    expect(layout).toContain('maplibregl-ctrl-bottom-left');
    expect(`${layout}\n${controls}`).not.toMatch(
      /maplibregl-(?:ctrl-group|ctrl-top-left|ctrl-top-right|ctrl-bottom-right)/
    );
    expect(controls).not.toContain('.mapBurger img');
  });
});
