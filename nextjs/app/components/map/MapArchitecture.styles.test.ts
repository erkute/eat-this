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
  'MapViewToggle.module.css',
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
      'markerRootActive',
      'markerRootFree',
      'pinLocked',
      'pinLockedActive',
      'pinLockedDot',
      'pinLogo',
      'pinLogoActive',
      'pinLogoEnter',
      'pinLogoHasMust',
      'pinLogoShape',
      'userLoc',
      'userLocAvatar',
    ]);
  });

  it('reveals the markers with movement, never with an opacity fade', () => {
    /* CLAUDE.md, repeatedly: entry motion on a brand surface translates (and
     * may rotate); it does not fade. A fade reads as "appearing" rather than as
     * motion and washes out the brand presence. The pins are held back until
     * the basemap has painted (MapCanvasLayer), so they genuinely have to
     * arrive — which is exactly the moment someone reaches for `opacity`.
     */
    const root = postcss.parse(readFileSync(modulePath('MapMarkers.module.css'), 'utf8'));
    const frames: string[] = [];
    root.walkAtRules('keyframes', (rule) => {
      rule.walkDecls((decl) => {
        expect(
          decl.prop,
          `@keyframes ${rule.params} animates ${decl.prop} — entry motion must translate, not fade`
        ).not.toBe('opacity');
        frames.push(rule.params);
      });
    });

    expect(frames, 'the marker drop-in keyframes went missing').toContain('pinDrop');
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
        '--detail-map-peek': '50dvh',
      }),
    ]);
    /* 28 is the number that has to stay in step with LIST_REST_VISIBLE_DVH in
     * phoneSheetSnaps.ts. Nothing is added to it: the cookie banner used to be
     * fixed over this exact edge and the sheet had to lift itself clear of it,
     * but consent is a blocking dialog on a scrim now and owns none of it.
     */
    const rest = shellRules[0]['--phone-list-sheet-visible'];
    expect(rest, 'the phone sheet lost its resting stop').toBeDefined();
    expect(rest, 'the resting stop must stay at 28dvh (= LIST_REST_VISIBLE_DVH)').toBe('28dvh');
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

  it('caps the phone status-bar band only while the filter header is stuck', () => {
    const mapPage = readFileSync(
      fileURLToPath(new URL('../../[locale]/(spa)/map/page.tsx', import.meta.url)),
      'utf8'
    );
    const headerRules = declarationsInMedia(
      'MapFilters.module.css',
      '.listHeader',
      '(max-width: 767.98px)'
    );
    /* Scoped to data-view='list': `data-header-stuck` is shared with the detail
       now (it drives the floating search/burger in both views), but the detail's
       top edge is a photo hero — a paper-coloured cap over it would read as a
       stray white stripe. */
    const capRules = declarationsInMedia(
      'MapSheet.module.css',
      ".list[data-view='list'][data-header-stuck='true']::before",
      '(max-width: 767.98px)'
    );

    expect(mapPage).toContain('themeColor: null');
    expect(mapPage).not.toContain("themeColor: '#15120e'");

    /* The header rests BELOW the band. Pinning it at 0 and carrying the inset
       as padding instead reserves that space at every scroll position, which
       shows up as dead whitespace above the chips at the resting stop. */
    expect(headerRules).toEqual([
      expect.objectContaining({
        position: 'sticky',
        top: 'env(safe-area-inset-top, 0px)',
      }),
    ]);

    /* The band is covered by a zero-layout pseudo-element, gated on the stuck
       state — so nothing shifts when it appears, and the resting sheet keeps
       no whitespace. Its height is the inset itself, which is 0 in a browser
       tab: there the cap collapses to nothing and rows still reach the top. */
    expect(capRules).toEqual([
      expect.objectContaining({
        position: 'fixed',
        top: '0',
        height: 'env(safe-area-inset-top, 0px)',
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
