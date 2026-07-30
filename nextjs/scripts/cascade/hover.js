// Pseudo-class pass: CDP-forced :hover / :focus-visible on the interactive
// controls, which the viewport sweep cannot reach. Run it before and after a
// prune the same way as sweep-controls.js; it parks results on window.__hover.
//
// The 450ms wait is load-bearing: these controls transition transform for up
// to 280ms and a read one frame in returns the pre-hover value, which reads
// as 'the hover rule is dead' and invites deleting a live declaration.

async (page) => {
  const TARGETS = ['mapSearchBtn', 'mapBurger', 'fab', 'panelToggle', 'mapSearchClear'];
  const PROPS = ['color', 'transform', 'background-color', 'filter', 'box-shadow', 'border', 'outline', 'top', 'right', 'left', 'width', 'height'];
  const WIDTHS = [320, 400, 1024, 1440];

  await page.goto('http://localhost:3000/map', { waitUntil: 'load' });
  await page.waitForSelector('[data-map-body]', { timeout: 15000 });
  await page.waitForTimeout(2500);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');

  const out = {};
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.waitForFunction((ww) => window.innerWidth === ww, w, { timeout: 5000 });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    // node ids must be re-resolved after each resize: the document may have
    // been re-laid-out and stale ids throw
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    for (const pseudo of ['none', 'hover', 'focus-visible']) {
      for (const t of TARGETS) {
        const sel = `[class*="MapControls_${t}__"]`;
        let nodeId = 0;
        try {
          ({ nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel }));
        } catch { nodeId = 0; }
        if (!nodeId) { out[`${w}|${pseudo}|${t}`] = 'ABSENT'; continue; }
        await cdp.send('CSS.forcePseudoState', {
          nodeId,
          forcedPseudoClasses: pseudo === 'none' ? [] : [pseudo],
        });
        // transitions on these controls run up to 280ms; reading one frame in
        // returns the interpolated START value, which reads as 'the rule did
        // not apply'. Wait them out.
        await page.waitForTimeout(450);
        const rec = await page.evaluate(
          ({ sel, props }) => {
            const el = document.querySelector(sel);
            if (!el) return 'ABSENT';
            const cs = getComputedStyle(el);
            return props.map((p) => p + '=' + cs.getPropertyValue(p)).join(' | ');
          },
          { sel, props: PROPS }
        );
        out[`${w}|${pseudo}|${t}`] = rec;
        await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      }
    }
  }
  await page.evaluate((d) => { window.__hover = d; }, out);
  return { keys: Object.keys(out).length, burgerHover: out['1440|hover|mapBurger'], fabHover: out['1440|hover|fab'], btnHover: out['1440|hover|mapSearchBtn'] };
}
