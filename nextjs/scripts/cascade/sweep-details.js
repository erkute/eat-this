// MapDetails sweep — read sweep-controls.js's header first for the timing traps.
//
// Three things are specific to this module:
//   1. It is the only map module with HEIGHT-gated rules (max-height 740/760,
//      min-height 741), so the sweep moves BOTH viewport axes.
//   2. Half of it only exists in the must-eat sheet and the other half only in
//      the restaurant sheet, so it runs two SCENARIOS by URL rather than
//      mounting probes: ?r=crapulix (a restaurant that HAS must-eats, which is
//      what mounts rdMustSection and the pack promo) and ?me=<id>.
//   3. Cells are U+0001-JOINED value lists, not objects. 94 property NAMES
//      repeated per class per state per viewport is what makes the payload too
//      large to hand back; diff-details.mjs maps an index to a property via
//      props-details.json.
//
// It does NOT hover anything — see hover-details.js for the pseudo-class pass.

async (page) => {
  const PREFIX = "MapDetails_";
  const PROPS = ["--d-bg","--d-hero-accent","--d-hero-bg","--d-hero-text","--d-ink","--d-rule","--d-text","--d-text-2","--d-text-3","--fd-card-h","--fd-stack-offset","--fd-stack-pad-x","--fd-stack-pad-y","--fd-title-size","--me-accent","--me-card-air","--me-card-gap","--me-card-h","--me-card-ratio","--me-card-w","--me-content-gap","--me-flow-gap","--me-footer-gap","--me-ink","--me-mid-slot","--me-muted","--me-name-copy-gap","--me-name-slot","--me-pager-slot","--me-paper","--me-rest-slot","--me-soft","--vibrate-duration","-webkit-box-orient","-webkit-line-clamp","align-items","align-self","aspect-ratio","background","border","bottom","color","column-gap","content","display","filter","flex","font","font-family","font-size","font-style","font-weight","gap","grid-auto-rows","grid-column","grid-row","grid-template-columns","grid-template-rows","height","hyphens","inset","justify-content","justify-items","justify-self","left","letter-spacing","line-clamp","line-height","margin","margin-top","max-height","max-width","min-height","min-width","opacity","overflow","overflow-wrap","overflow-x","overflow-y","padding","place-self","position","right","row-gap","text-align","text-transform","text-wrap","top","transform","visibility","white-space","width","word-break","z-index"];
  // width x height pairs: MapDetails is the only map module with HEIGHT-gated
  // rules (max-height 740/760, min-height 741), so both axes have to move.
  const VIEWPORTS = [
    [320, 720], [380, 741], [381, 800], [421, 800], [700, 800],
    [768, 800], [1023, 800], [1024, 750], [1440, 900],
  ];
  // Two scenarios, because half this module only exists in the must-eat sheet
  // and the other half only in the restaurant sheet. crapulix is a restaurant
  // that HAS must-eats, which is what mounts rdMustSection + the pack promo.
  const SCENARIOS = [
    ["restaurant", "http://localhost:3000/map?r=crapulix"],
    ["must-eat", "http://localhost:3000/map?me=80307ebe-5142-4421-b615-93200a5cfb55"],
  ];

  const HARNESS = ({ prefix, props }) => {
    const body = document.querySelector("[data-map-body]");
    const sheetEl = document.querySelector("[data-map-sheet]");
    if (!body) return { error: "no [data-map-body]" };

    const hashed = new Set();
    for (const sh of document.styleSheets) {
      let rules;
      try { rules = sh.cssRules; } catch { continue; }
      const walk = (l) => {
        for (const r of l) {
          if (r.cssRules) walk(r.cssRules);
          if (!r.selectorText) continue;
          const re = new RegExp("\\.(" + prefix + "[A-Za-z0-9_-]+)", "g");
          for (const m of r.selectorText.matchAll(re)) hashed.add(m[1]);
        }
      };
      walk(rules);
    }

    const targets = [];
    for (const h of [...hashed].sort()) {
      const el = document.querySelector("." + CSS.escape(h));
      if (!el) continue;
      targets.push({ cls: h.slice(prefix.length).replace(/__.*$/, ""), el });
    }

    const before = {
      view: body.getAttribute("data-map-view"),
      kind: body.getAttribute("data-detail-kind"),
      sheetView: sheetEl ? sheetEl.getAttribute("data-view") : null,
      sheetKind: sheetEl ? sheetEl.getAttribute("data-detail-kind") : null,
    };
    const setPair = (view, kind) => {
      body.setAttribute("data-map-view", view);
      body.setAttribute("data-detail-kind", kind);
      if (sheetEl) {
        sheetEl.setAttribute("data-view", view);
        sheetEl.setAttribute("data-detail-kind", kind);
      }
    };

    const meta = {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      visibility: document.visibilityState,
      mq: {
        w380: matchMedia("(max-width: 380px)").matches,
        w420: matchMedia("(max-width: 420px)").matches,
        w768: matchMedia("(min-width: 768px)").matches,
        desktop: matchMedia("(min-width: 1024px)").matches,
        h740: matchMedia("(max-height: 740px)").matches,
        h760: matchMedia("(min-width: 1024px) and (max-height: 760px)").matches,
        hover: matchMedia("(hover: hover)").matches,
      },
      targets: targets.map((t) => t.cls),
    };

    // Cells are JOINED strings, not objects: 94 property NAMES repeated per
    // class per state per viewport is what makes this payload untransferable.
    const byState = {};
    for (const view of ["list", "detail"])
      for (const kind of ["restaurant", "must-eat"]) {
        setPair(view, kind);
        void body.offsetHeight;
        const cells = {};
        for (const t of targets) {
          for (const pseudo of [null, "::before", "::after", "::first-letter"]) {
            const cs = getComputedStyle(t.el, pseudo);
            if ((pseudo === "::before" || pseudo === "::after") && cs.content === "none") continue;
            const vals = props.map((p) => cs.getPropertyValue(p));
            if (!pseudo) vals.push(t.el.offsetWidth + "x" + t.el.offsetHeight);
            cells[t.cls + (pseudo ?? "")] = vals.join("\u0001");
          }
        }
        byState[view + "/kind=" + kind] = cells;
      }

    setPair(before.view ?? "detail", before.kind ?? "restaurant");
    return { meta, byState };
  };

  const out = {};
  const summary = [];
  for (const [name, url] of SCENARIOS) {
    await page.goto(url, { waitUntil: "load" });
    await page.waitForSelector("[data-map-body]", { timeout: 25000 });
    await page.waitForTimeout(5000);
    const kind = await page.evaluate(() =>
      document.querySelector("[data-map-body]")?.getAttribute("data-detail-kind")
    );
    out[name] = {};
    for (const [w, h] of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForFunction(
        ([ww, hh]) =>
          window.innerWidth === ww &&
          window.innerHeight === hh &&
          matchMedia("(max-width: 380px)").matches === ww <= 380 &&
          matchMedia("(max-width: 420px)").matches === ww <= 420 &&
          matchMedia("(min-width: 1024px)").matches === ww >= 1024 &&
          matchMedia("(max-height: 740px)").matches === hh <= 740,
        [w, h],
        { timeout: 5000 }
      );
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const snap = await page.evaluate(HARNESS, { prefix: PREFIX, props: PROPS });
      if (snap.error) throw new Error(name + " " + w + "x" + h + ": " + snap.error);
      if (snap.meta.innerWidth !== w || snap.meta.innerHeight !== h)
        throw new Error(name + ": measured " + snap.meta.innerWidth + "x" + snap.meta.innerHeight);
      out[name][w + "x" + h] = snap;
    }
    summary.push(name + " (kind=" + kind + "): " + out[name]["320x720"].meta.targets.length + " targets");
  }

  await page.evaluate((d) => { window.__snaps = d; }, out);
  return { props: PROPS.length, summary };
}
