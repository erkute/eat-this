// Computed-style sweep: viewports x the 24 [data-map-body] states x every
// class a CSS module ships, including the ones the live DOM never shows.
//
// HOW TO RUN — this needs a `page`, so it goes through the Playwright MCP:
//   browser_run_code_unsafe { filename: "<repo>/nextjs/scripts/cascade/sweep-controls.js" }
// then dump the result (the sweep parks it on window.__snaps):
//   browser_evaluate { function: "() => JSON.stringify(window.__snaps)",
//                      filename: ".playwright-mcp/cascade/snapshot-X.json" }
// and diff two snapshots with diff.mjs. Run the dev server first.
//
// THE THREE WAYS THIS MEASUREMENT LIES — all three are guarded below, and all
// three produced a "difference" that no CSS change caused:
//
//  1. Media queries re-match a frame LATE. After a resize, window.innerWidth
//     and matchMedia() already report the new width while the style engine has
//     not re-matched @media rules yet. A snapshot taken there carries the
//     PREVIOUS width's values: that is how a 320px baseline recorded
//     .mapStatusLayer at translateY(0) — the >=768px value — and made a prune
//     that changed nothing look like it moved the toast 162px. Guarding on
//     innerWidth/matchMedia is NOT enough; the double rAF is what fixes it.
//
//  2. Transitions. These controls transition transform for up to 280ms, so a
//     computed style read right after a state change returns the interpolated
//     START value — indistinguishable from "the rule did not apply".
//
//  3. Used values drift. top/bottom/left/right/inset on an absolutely
//     positioned element resolve against the surrounding layout, so they
//     differ between two runs of IDENTICAL code (measured: 160 cells, all
//     bottom/inset on the two status toasts). Establish that noise floor by
//     diffing two same-code runs before trusting any before/after diff.
//
// Only delete a declaration this sweep actually covers. Pseudo-class rules
// (:hover, :focus-visible) are NOT covered here — see hover.js.
async (page) => {

  const WIDTHS = [320, 360, 400, 520, 600, 768, 1023, 1024, 1440];
  const PREFIX = "MapControls_";

  const HARNESS = ({ prefix }) => {
    const PROPS = [
      "-webkit-appearance",
      "-webkit-backdrop-filter",
      "-webkit-tap-highlight-color",
      "align-items",
      "animation",
      "appearance",
      "backdrop-filter",
      "background",
      "background-color",
      "border",
      "border-color",
      "border-radius",
      "bottom",
      "box-shadow",
      "box-sizing",
      "caret-color",
      "clip-path",
      "color",
      "content",
      "cursor",
      "display",
      "fill",
      "filter",
      "flex",
      "flex-basis",
      "font",
      "font-family",
      "font-size",
      "font-weight",
      "gap",
      "grid-template-columns",
      "height",
      "inset",
      "justify-content",
      "justify-self",
      "left",
      "letter-spacing",
      "line-height",
      "margin-inline",
      "min-height",
      "min-width",
      "opacity",
      "outline",
      "outline-offset",
      "overflow",
      "padding",
      "padding-left",
      "place-items",
      "pointer-events",
      "position",
      "right",
      "stroke",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-width",
      "text-overflow",
      "text-shadow",
      "text-transform",
      "top",
      "touch-action",
      "transform",
      "transform-origin",
      "transition",
      "visibility",
      "white-space",
      "width",
      "will-change",
      "z-index",
    ];
    const body = document.querySelector("[data-map-body]");
    if (!body) return { error: "no [data-map-body]" };

    const hashed = new Set();
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      const walk = (list) => {
        for (const r of list) {
          if (r.cssRules) walk(r.cssRules);
          if (!r.selectorText) continue;
          const re = new RegExp("\\.(" + prefix + "[A-Za-z0-9_-]+)", "g");
          for (const m of r.selectorText.matchAll(re)) hashed.add(m[1]);
        }
      };
      walk(rules);
    }
    const local = (n) =>
      [...hashed].find((c) => c.startsWith(prefix + n + "__")) || null;

    // ---- probes for classes the live DOM never shows ---------------------
    document.querySelectorAll("[data-probe]").forEach((n) => n.remove());
    const mk = (tag, cls, text) => {
      const el = document.createElement(tag);
      for (const c of cls) {
        const h = local(c);
        if (h) el.classList.add(h);
      }
      if (text != null) el.textContent = text;
      return el;
    };
    const mount = (el) => {
      el.setAttribute("data-probe", "");
      body.appendChild(el);
      return el;
    };
    const needProbe = (n) => {
      const h = local(n);
      return h && !document.querySelector("." + CSS.escape(h));
    };
    const statusProbe = (extra) => {
      const el = mk("div", ["mapStatusLayer", ...extra]);
      el.appendChild(
        mk(
          "span",
          ["mapStatusText"],
          "Standort konnte nicht ermittelt werden.",
        ),
      );
      el.appendChild(mk("button", ["mapStatusAction"], "Nochmal"));
      el.appendChild(mk("button", ["mapStatusDismiss"], "×"));
      return mount(el);
    };
    if (needProbe("mapStatusLayer")) statusProbe([]);
    if (needProbe("mapStatusLayerError")) statusProbe(["mapStatusLayerError"]);
    if (needProbe("mapSearchToolbar")) {
      const el = mk("div", ["mapSearchToolbar"]);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const icon = local("mapSearchIcon");
      if (icon) svg.setAttribute("class", icon);
      svg.setAttribute("viewBox", "0 0 24 24");
      el.appendChild(svg);
      const input = mk("input", ["mapSearchInput"]);
      input.type = "search";
      input.placeholder = "Spot, Kiez, Gericht";
      el.appendChild(input);
      el.appendChild(mk("button", ["mapSearchClear"], "×"));
      mount(el);
    }

    const targets = [];
    for (const h of [...hashed].sort()) {
      const el = document.querySelector("." + CSS.escape(h));
      if (!el) continue;
      targets.push({
        cls: h.slice(prefix.length).replace(/__.*$/, ""),
        el,
        probe: el.hasAttribute("data-probe") || !!el.closest("[data-probe]"),
      });
    }

    const mq = () => ({
      p360: matchMedia("(max-width: 360px)").matches,
      p520: matchMedia("(max-width: 520px)").matches,
      phone: matchMedia("(max-width: 767.98px)").matches,
      belowDesktop: matchMedia("(max-width: 1023.98px)").matches,
      desktop: matchMedia("(min-width: 1024px)").matches,
      hover: matchMedia("(hover: hover)").matches,
    });

    const before = {
      view: body.getAttribute("data-map-view"),
      snap: body.getAttribute("data-map-snap"),
      stuck: body.getAttribute("data-header-stuck"),
      hidden: body.getAttribute("data-panel-hidden"),
    };
    const setAttr = (n, v) => {
      if (v == null) body.removeAttribute(n);
      else body.setAttribute(n, v);
    };

    const meta = {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      visibility: document.visibilityState,
      mqAtMeasure: mq(),
      targets: targets.map((t) => t.cls + (t.probe ? " (probe)" : "")),
    };

    const byState = {};
    for (const view of ["list", "detail"])
      for (const snap of ["peek", "mid", "full"])
        for (const stuck of [null, "true"])
          for (const hidden of [null, "true"]) {
            setAttr("data-map-view", view);
            setAttr("data-map-snap", snap);
            setAttr("data-header-stuck", stuck);
            setAttr("data-panel-hidden", hidden);
            void body.offsetHeight;
            const cells = {};
            for (const t of targets) {
              const cs = getComputedStyle(t.el);
              const rec = {};
              for (const p of PROPS) rec[p] = cs.getPropertyValue(p);
              rec["@size"] = t.el.offsetWidth + "x" + t.el.offsetHeight;
              cells[t.cls] = rec;
            }
            byState[
              `${view}/${snap}/stuck=${stuck ?? "-"}/hidden=${hidden ?? "-"}`
            ] = cells;
          }

    setAttr("data-map-view", before.view);
    setAttr("data-map-snap", before.snap);
    setAttr("data-header-stuck", before.stuck);
    setAttr("data-panel-hidden", before.hidden);
    return { meta, byState };
  };

  // Fresh load every run so the two sides of a diff start from the same page,
  // then let the basemap and the marker drop-in finish — the toast's used
  // top/bottom depend on the surrounding layout.
  await page.goto("http://localhost:3000/map", { waitUntil: "load" });
  await page.waitForSelector("[data-map-body]", { timeout: 15000 });
  await page.waitForTimeout(2500);

  const out = {};
  const summary = [];
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 844 });
    // settle: the page must agree about its width AND its MQ state must match it
    await page.waitForFunction(
      (ww) =>
        window.innerWidth === ww &&
        matchMedia("(max-width: 767.98px)").matches === ww <= 767 &&
        matchMedia("(min-width: 1024px)").matches === ww >= 1024 &&
        matchMedia("(max-width: 360px)").matches === ww <= 360 &&
        matchMedia("(max-width: 520px)").matches === ww <= 520,
      w,
      { timeout: 5000 },
    );
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    const snap = await page.evaluate(HARNESS, { prefix: PREFIX });
    if (snap.error) throw new Error(`viewport ${w}: ${snap.error}`);
    // guard: refuse a snapshot whose own measurement context disagrees
    const m = snap.meta;
    if (m.innerWidth !== w)
      throw new Error(`viewport ${w}: measured innerWidth ${m.innerWidth}`);
    if (m.mqAtMeasure.phone !== w <= 767)
      throw new Error(`viewport ${w}: phone MQ ${m.mqAtMeasure.phone}`);
    if (m.visibility !== "visible")
      throw new Error(`viewport ${w}: visibility ${m.visibility}`);
    out[w] = snap;
    summary.push(
      `${w}: ${Object.keys(snap.byState).length} states, ${m.targets.length} targets, mq=${JSON.stringify(m.mqAtMeasure)}`,
    );
  }

  await page.evaluate((data) => { window.__snaps = data; }, out);
  return { viewports: Object.keys(out), targets: out[320].meta.targets, summary };
}
