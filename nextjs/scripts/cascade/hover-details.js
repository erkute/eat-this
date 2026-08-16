// Pseudo-class pass for MapDetails: CDP-forced :hover / :focus-visible /
// :active on the interactive detail controls, which the viewport sweep cannot
// reach. Three of MapDetails' dead declarations sat behind
// `@media (hover: hover) { .rdActBtn:hover }` and were only provable here.

async (page) => {
  const TARGETS = ['rdActBtn', 'rdHeartToggle', 'rdCloseGlass', 'rdPagerBtn', 'btnPackPromo', 'ctaPill', 'rdTipp'];
  const PROPS = ['transform', 'background-color', 'background-image', 'color', 'border-color', 'box-shadow', 'filter', 'opacity', 'outline-color', 'width', 'height'];
  const WIDTHS = [[380, 741], [421, 800], [1440, 900]];
  const URL = 'http://localhost:3000/map?r=crapulix';

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('[data-map-body]', { timeout: 25000 });
  await page.waitForTimeout(5000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');

  const out = {};
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForFunction(([ww, hh]) => window.innerWidth === ww && window.innerHeight === hh, [w, h], { timeout: 5000 });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    for (const pseudo of ['none', 'hover', 'focus-visible', 'active']) {
      for (const t of TARGETS) {
        const sel = `[class*="MapDetails_${t}__"]`;
        let nodeId = 0;
        try { ({ nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel })); } catch { nodeId = 0; }
        const key = `${w}x${h}|${pseudo}|${t}`;
        if (!nodeId) { out[key] = 'ABSENT'; continue; }
        await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: pseudo === 'none' ? [] : [pseudo] });
        // transitions here run to 280ms; a one-frame read returns the old value
        await page.waitForTimeout(450);
        out[key] = await page.evaluate(({ sel, props }) => {
          const el = document.querySelector(sel);
          if (!el) return 'ABSENT';
          const cs = getComputedStyle(el);
          return props.map((p) => p + '=' + cs.getPropertyValue(p)).join(' | ');
        }, { sel, props: PROPS });
        await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      }
    }
  }
  await page.evaluate((d) => { window.__hoverDetails = d; }, out);
  const absent = Object.entries(out).filter(([, v]) => v === 'ABSENT').map(([k]) => k.split('|')[2]);
  return { records: Object.keys(out).length, absentClasses: [...new Set(absent)] };
}
