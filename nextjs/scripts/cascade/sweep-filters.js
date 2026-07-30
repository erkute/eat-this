// MapFilters variant of sweep-controls.js — read that file's header first.
// Difference that matters: MapFilterPickerSheet portals to document.body, so
// its probe mounts there and NOT inside [data-map-body], or the
// :global([data-map-body]...) contexts resolve differently than they do live.
// 15 of MapFilters' 20 classes are absent from the DOM until a picker opens.

async (page) => {
  const WIDTHS = [320, 360, 400, 520, 600, 768, 1023, 1024, 1440];
  const PREFIX = "MapFilters_";

  const HARNESS = ({ prefix }) => {
    const PROPS = ["-webkit-backdrop-filter","-webkit-overflow-scrolling","-webkit-tap-highlight-color","align-content","align-items","animation","appearance","backdrop-filter","background","border","border-bottom","border-bottom-color","border-color","border-left","border-radius","border-top","border-top-left-radius","border-top-right-radius","bottom","box-shadow","box-sizing","color","content","cursor","display","fill","filter","flex","flex-basis","flex-direction","flex-grow","flex-shrink","font","font-family","font-size","font-weight","gap","grid-auto-columns","grid-auto-flow","grid-template-columns","height","hyphens","inset","justify-content","left","letter-spacing","line-height","margin-left","max-height","max-width","min-height","min-width","opacity","outline","overflow","overflow-wrap","overflow-x","overflow-y","overscroll-behavior","overscroll-behavior-x","padding","padding-block","padding-bottom","padding-inline","padding-left","padding-right","padding-top","place-items","pointer-events","position","right","scroll-padding-bottom","scrollbar-width","stroke","stroke-linecap","stroke-width","text-align","text-decoration","text-overflow","text-shadow","text-transform","top","touch-action","transform","transition","visibility","white-space","width","word-break","z-index"];

    const body = document.querySelector("[data-map-body]");
    if (!body) return { error: "no [data-map-body]" };

    const hashed = new Set();
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
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
    const local = (n) => [...hashed].find((c) => c.startsWith(prefix + n + "__")) || null;

    document.querySelectorAll("[data-probe]").forEach((n) => n.remove());
    const mk = (tag, cls, text) => {
      const el = document.createElement(tag);
      for (const c of cls) { const h = local(c); if (h) el.classList.add(h); }
      if (text != null) el.textContent = text;
      return el;
    };

    // The picker is portalled to document.body, NOT into [data-map-body] — mount
    // its probe where the real one lives or the :global contexts differ.
    const pickerRoot = document.createElement("div");
    pickerRoot.setAttribute("data-probe", "");
    const backdrop = mk("div", ["pickerBackdrop"]);
    const sheet = mk("div", ["pickerSheet"]);
    const head = mk("div", ["pickerHead"]);
    head.appendChild(mk("span", ["pickerTitle"], "Bezirk"));
    head.appendChild(mk("button", ["pickerClose"], "×"));
    sheet.appendChild(head);
    const list = mk("div", ["pickerList"]);
    for (const [cls, label] of [[[], "Alle"], [["pickerItemActive"], "Kreuzberg"]]) {
      const item = mk("button", ["pickerItem", ...cls]);
      item.appendChild(mk("span", ["pickerItemLabel"], label));
      item.appendChild(mk("span", ["pickerItemSub"], "12 Spots"));
      list.appendChild(item);
    }
    sheet.appendChild(list);
    sheet.appendChild(mk("div", ["pickerFooter"], "Zurücksetzen"));
    pickerRoot.appendChild(backdrop);
    pickerRoot.appendChild(sheet);
    document.body.appendChild(pickerRoot);

    // Chip modifier classes: mount extra chips in the real chip row so the
    // active/long/clear variants are exercised in their true context.
    const rowCls = local("filterChipRow");
    const row = rowCls ? document.querySelector("." + CSS.escape(rowCls)) : null;
    if (row) {
      const wrap = mk("span", ["filterChipWrap"]);
      wrap.setAttribute("data-probe", "");
      const chip = mk("button", ["filterChip", "filterChipActive"]);
      chip.appendChild(mk("span", ["filterChipLabel", "filterChipLabelLong"], "Charlottenburg"));
      wrap.appendChild(chip);
      const clear = mk("button", ["filterChipClear"]);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      clear.appendChild(svg);
      wrap.appendChild(clear);
      row.appendChild(wrap);

      const openChip = mk("button", ["filterChip", "filterChipOpenActive"], "Geöffnet");
      openChip.setAttribute("data-probe", "");
      row.appendChild(openChip);
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
    const setAttr = (n, v) => { if (v == null) body.removeAttribute(n); else body.setAttribute(n, v); };

    const meta = {
      innerWidth: window.innerWidth,
      visibility: document.visibilityState,
      mqAtMeasure: mq(),
      targets: targets.map((t) => t.cls + (t.probe ? " (probe)" : "")),
      missing: [...hashed]
        .map((h) => h.slice(prefix.length).replace(/__.*$/, ""))
        .filter((c) => !targets.some((t) => t.cls === c)),
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
            byState[`${view}/${snap}/stuck=${stuck ?? "-"}/hidden=${hidden ?? "-"}`] = cells;
          }

    setAttr("data-map-view", before.view);
    setAttr("data-map-snap", before.snap);
    setAttr("data-header-stuck", before.stuck);
    setAttr("data-panel-hidden", before.hidden);
    return { meta, byState };
  };

  await page.goto("http://localhost:3000/map", { waitUntil: "load" });
  await page.waitForSelector("[data-map-body]", { timeout: 15000 });
  await page.waitForTimeout(2500);

  const out = {};
  const summary = [];
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.waitForFunction(
      (ww) =>
        window.innerWidth === ww &&
        matchMedia("(max-width: 767.98px)").matches === ww <= 767 &&
        matchMedia("(min-width: 1024px)").matches === ww >= 1024 &&
        matchMedia("(max-width: 360px)").matches === ww <= 360 &&
        matchMedia("(max-width: 520px)").matches === ww <= 520,
      w,
      { timeout: 5000 }
    );
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const snap = await page.evaluate(HARNESS, { prefix: PREFIX });
    if (snap.error) throw new Error(`viewport ${w}: ${snap.error}`);
    const m = snap.meta;
    if (m.innerWidth !== w) throw new Error(`viewport ${w}: measured innerWidth ${m.innerWidth}`);
    if (m.mqAtMeasure.phone !== w <= 767) throw new Error(`viewport ${w}: phone MQ wrong`);
    out[w] = snap;
    summary.push(`${w}: ${m.targets.length} targets, missing=[${m.missing.join(",")}]`);
  }

  await page.evaluate((data) => { window.__snaps = data; }, out);
  return { viewports: Object.keys(out), targets: out[320].meta.targets, summary: summary.slice(0, 2) };
}
