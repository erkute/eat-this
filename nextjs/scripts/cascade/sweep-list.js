// RestaurantList variant of sweep-controls.js — read that file's header first.
//
// This one also measures ::before and ::after. getComputedStyle(el) says nothing
// about them, so without this pass RestaurantList's dead `.rcard::after`
// gradient would have been deleted unmeasured. Pseudos whose `content` is
// `none` are skipped, or every class collects a full set of empty rows.
//
// 26 of the 27 classes are live on /map, end-of-list fan included; only the
// selected-card modifier needs a probe. Widths sit on both sides of every
// breakpoint the module actually uses (380/420/600/1023.98/1024).

async (page) => {

  const WIDTHS = [320, 380, 400, 420, 600, 601, 768, 1023, 1024, 1440];
  const PREFIX = "RestaurantList_";

  const HARNESS = ({ prefix }) => {
    const PROPS = ["-webkit-backdrop-filter", "-webkit-tap-highlight-color", "align-content", "align-items", "appearance", "aspect-ratio", "backdrop-filter", "background", "background-color", "background-image", "background-position", "background-repeat", "background-size", "border", "border-bottom", "border-color", "border-radius", "bottom", "box-shadow", "color", "contain-intrinsic-size", "content", "content-visibility", "cursor", "display", "filter", "flex", "flex-direction", "flex-wrap", "font-family", "font-size", "font-weight", "gap", "grid-template-columns", "grid-template-rows", "height", "hyphens", "inset", "justify-content", "left", "letter-spacing", "line-height", "margin", "margin-bottom", "margin-top", "max-height", "max-width", "min-height", "min-width", "object-fit", "object-position", "opacity", "outline", "outline-offset", "overflow", "overflow-wrap", "padding", "pointer-events", "position", "right", "text-align", "text-decoration", "text-decoration-thickness", "text-overflow", "text-shadow", "text-transform", "text-underline-offset", "text-wrap", "top", "transform", "transform-origin", "transition", "visibility", "white-space", "width", "word-break", "z-index"];
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
      for (const c of cls) { const h = local(c); if (h) el.classList.add(h); }
      if (text != null) el.textContent = text;
      return el;
    };
    // 26 of 27 classes are live on /map, fan included. Only the selected-card
    // modifier needs a probe, and it has to sit in the list next to a real card
    // so the :global([data-map-body]...) contexts and the grid resolve alike.
    const cardCls = local("rcard");
    const realCard = cardCls ? document.querySelector("." + CSS.escape(cardCls)) : null;
    if (realCard && realCard.parentElement) {
      const probe = mk("article", ["rcard", "rcardActive"]);
      probe.setAttribute("data-probe", "");
      const img = mk("div", ["rcardImg"]);
      probe.appendChild(img);
      const bodyEl = mk("div", ["rcardBody"]);
      bodyEl.appendChild(mk("h3", ["rcardName"], "Romeo's Sandwiches"));
      const meta = mk("div", ["rcardMeta"]);
      meta.appendChild(mk("span", ["rcardMetaChip", "rcardMetaDistrict"], "Kreuzberg"));
      meta.appendChild(mk("span", ["rcardMetaChip", "rcardMetaCategory"], "Fast Food"));
      bodyEl.appendChild(meta);
      probe.appendChild(bodyEl);
      realCard.parentElement.appendChild(probe);
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
              for (const pseudo of [null, "::before", "::after"]) {
                const cs = getComputedStyle(t.el, pseudo);
                // Skip a pseudo the class does not generate at all, or every
                // class picks up 77 identical `content: none` rows.
                if (pseudo && cs.content === "none") continue;
                const rec = {};
                for (const p of PROPS) rec[p] = cs.getPropertyValue(p);
                if (!pseudo) rec["@size"] = t.el.offsetWidth + "x" + t.el.offsetHeight;
                cells[t.cls + (pseudo ?? "")] = rec;
              }
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
