// Computed-style sweep for the map's layer mechanics: MapLayout, MapSheet and
// the list header, in the REAL states they depend on — list at rest and deep,
// restaurant detail at rest and deep, must-eat takeover — at three widths.
// Unlike sweep-controls.js it cannot fake a state with attributes on the body:
// these rules key off the sheet's own view, the detail kind and the scroll
// position, so each state is navigated to.
//
// Run like the others (a `page` is needed) and diff with diff.mjs. Two runs
// of the same code first: list order follows the map centre, so row-bound
// values may drift.
async (page) => {
  const BASE = 'http://localhost:3000';
  const WIDTHS = [390, 800, 1280];
  const MUST_EAT = '80307ebe-5142-4421-b615-93200a5cfb55';
  const SCENARIOS = [
    { name: 'list', path: '/map', scroll: 0 },
    { name: 'list-deep', path: '/map', scroll: 2400 },
    { name: 'detail', path: '/map?r=sofi', scroll: 0 },
    { name: 'detail-deep', path: '/map?r=sofi', scroll: 1400 },
    { name: 'must-eat', path: `/map?me=${MUST_EAT}`, scroll: 0 },
  ];

  const HARNESS = () => {
    const PROPS = [
      'animation-name', 'background-color', 'background-image', 'border-radius',
      'border-top-color', 'border-top-width', 'bottom', 'box-shadow', 'clip-path',
      'display', 'filter', 'height', 'inset', 'isolation', 'left', 'margin-top',
      'max-height', 'min-height', 'opacity', 'overflow-x', 'overflow-y',
      'padding-bottom', 'padding-top', 'pointer-events', 'position', 'right',
      'top', 'touch-action', 'transform', 'translate', 'visibility',
      'will-change', 'width', 'z-index',
    ];
    const out = {};
    const seen = new Map();
    const label = (el) => {
      const cls = [...el.classList]
        .map((c) => c.match(/^(MapLayout|MapSheet|MapFilters)_([A-Za-z0-9]+)__/))
        .filter(Boolean)
        .map((m) => `${m[1]}.${m[2]}`);
      const base = cls.length ? cls.join('+') : el.getAttribute('data-sweep');
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return n ? `${base}#${n}` : base;
    };
    const extra = [
      ['[data-map-strip]', 'strip'],
      ['[data-map-canvas]', 'mapCanvas'],
      ['.maplibregl-canvas', 'glCanvas'],
      ['.maplibregl-ctrl-bottom-left', 'credit'],
      ['[data-sheet-handle]', 'handle'],
      ['[data-sheet-content]', 'content'],
    ];
    for (const [sel, name] of extra) {
      document.querySelectorAll(sel).forEach((el) => el.setAttribute('data-sweep', name));
    }
    const els = [
      ...document.querySelectorAll(
        '[class*="MapLayout_"], [class*="MapSheet_"], [class*="MapFilters_listHeader"], [data-sweep]'
      ),
    ];
    for (const el of els) {
      const key = label(el);
      if (!key) continue;
      const cs = getComputedStyle(el);
      const rec = {};
      for (const p of PROPS) rec[p] = cs.getPropertyValue(p);
      const r = el.getBoundingClientRect();
      rec['@rect'] = [r.top, r.left, r.width, r.height].map(Math.round).join(' ');
      out[key] = rec;
    }
    return { scrollY: Math.round(window.scrollY), els: out };
  };

  const result = {};
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 844 });
    for (const s of SCENARIOS) {
      await page.goto(BASE + s.path, { waitUntil: 'load' });
      await page.waitForSelector('[data-map-sheet]', { timeout: 20000 });
      await page.waitForTimeout(3500);
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), s.scroll);
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      );
      await page.waitForTimeout(400);
      (result[s.name] ??= {})[w] = await page.evaluate(HARNESS);
    }
  }
  await page.evaluate((data) => {
    window.__snaps = data;
  }, result);
  return Object.keys(result);
}
