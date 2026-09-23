/**
 * The phone map strip: a slice of map that stays above the list, all the way
 * up — the Google Maps look (user, 22.09.2026).
 *
 * The map lies BEHIND the window-scrolled list. Earlier versions lifted the
 * one map over the list once the list reached the strip, and that switch hung
 * on the main thread: iOS scrolls in its UI process, the switch came a frame
 * or two late, and on a fast flick the rows ran up past the bar into the strip
 * before the map covered them (user, 23.09.2026). Buffers only moved the line.
 *
 * So nothing switches any more. The strip is a fixed layer of its own, always
 * above the list, and it shows a COPY of the map's top slice: every time
 * MapLibre draws a frame, that frame's top rows are copied into the strip's
 * canvas in the same task — the WebGL drawing buffer is still intact then, so
 * no `preserveDrawingBuffer` is needed. The pins are DOM, so they are cloned
 * and their transforms copied on the same beat. At any scroll position the
 * strip is pixel for pixel what the map shows there, which makes it invisible
 * over the map and a strip of map over the list.
 *
 * Not a second MapLibre map: its own tiles, its own label placement for a
 * 72px viewport — labels at the strip's edge would differ from the map below.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';

const PHONE_QUERY = '(max-width: 767.98px)';

/* A pin reaches this far above its anchor point (its bottom edge) and can
   hang this far below it; outside that band around the strip it is not in
   the strip at all. */
const PIN_REACH_UP_PX = 64;
const PIN_REACH_DOWN_PX = 8;

function isMarker(node: Element): node is HTMLElement {
  return node instanceof HTMLElement && node.classList.contains('maplibregl-marker');
}

/* The marker's anchor on screen, from MapLibre's own transform:
   `translate(-50%, -100%) translate(<x>px, <y>px) …`. */
const PIXEL_TRANSLATE = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\)/;
function anchorY(transform: string): number | null {
  const match = PIXEL_TRANSLATE.exec(transform);
  return match ? Number(match[2]) : null;
}

/**
 * Start copying `map` into the strip `host` (a `<canvas>` plus a
 * `[data-map-strip-pins]` layer). Returns the teardown.
 */
export function mirrorMapStrip(map: MapLibreMap, host: HTMLElement): () => void {
  const canvas = host.querySelector('canvas');
  const pins = host.querySelector<HTMLElement>('[data-map-strip-pins]');
  const ctx = canvas?.getContext('2d', { alpha: false });
  if (!canvas || !pins || !ctx) return () => {};

  const source = map.getCanvas();
  /* MapLibre appends every marker's element to the canvas container. */
  const markerRoot = map.getCanvasContainer();
  const phone = window.matchMedia(PHONE_QUERY);
  const clones = new Map<HTMLElement, HTMLElement>();
  let hostHeight = host.clientHeight;

  /* Follow the marker, or step out of the way. The map carries hundreds of
     pins and each is a compositing layer (will-change: transform); only the
     few in the strip are shown here, the rest are display:none and cost no
     layer. */
  const place = (marker: HTMLElement, clone: HTMLElement) => {
    const transform = marker.style.transform;
    const y = anchorY(transform);
    const inStrip =
      y === null || (y > -PIN_REACH_DOWN_PX && y < hostHeight + PIN_REACH_UP_PX);
    const display = inStrip ? '' : 'none';
    if (clone.style.display !== display) clone.style.display = display;
    if (inStrip) clone.style.transform = transform;
  };

  /* Bring the clone layer in line with the markers: new ones cloned, changed
     ones (`dirty`) re-cloned, gone ones dropped, all in the markers' DOM
     order — MapLibre stacks markers by that order, so the copy must too. */
  const syncPins = (dirty: ReadonlySet<Element>) => {
    const order: HTMLElement[] = [];
    const live = new Set<HTMLElement>();
    for (const child of markerRoot.children) {
      if (!isMarker(child)) continue;
      live.add(child);
      let clone = clones.get(child);
      if (!clone || dirty.has(child)) {
        clone = child.cloneNode(true) as HTMLElement;
        clones.set(child, clone);
        place(child, clone);
      }
      order.push(clone);
    }
    for (const marker of clones.keys()) {
      if (!live.has(marker)) clones.delete(marker);
    }
    /* Touch only what moved: an untouched clone keeps its running
       transitions. Stale clones end up past the end and are cut there. */
    order.forEach((clone, i) => {
      const at = pins.children[i];
      if (at !== clone) pins.insertBefore(clone, at ?? null);
    });
    while (pins.children.length > order.length) pins.lastElementChild?.remove();
  };

  const draw = () => {
    if (!phone.matches) return;
    const width = source.width;
    const height = Math.min(source.height, Math.round(hostHeight * map.getPixelRatio()));
    if (width <= 0 || height <= 0) return;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctx.drawImage(source, 0, 0, width, height, 0, 0, width, height);
    /* MapLibre writes marker transforms on `move`, before the frame is drawn;
       copied here they land on the same frame as the map under them. */
    for (const [marker, clone] of clones) place(marker, clone);
  };

  const observer = new MutationObserver((records) => {
    const dirty = new Set<Element>();
    for (const record of records) {
      if (record.type !== 'attributes') continue;
      const target = record.target instanceof Element ? record.target : null;
      const marker = target?.closest('.maplibregl-marker');
      if (marker) dirty.add(marker);
    }
    syncPins(dirty);
  });
  /* `class` only: the marker roots rewrite their inline transform on every
     move, and those are copied in `draw`, not re-cloned. */
  observer.observe(markerRoot, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  const resize = new ResizeObserver(() => {
    hostHeight = host.clientHeight;
    map.triggerRepaint();
  });
  resize.observe(host);

  /* Back on a phone width after a resize: the strip holds whatever it last
     copied, so ask for a fresh frame. */
  const onPhoneChange = () => map.triggerRepaint();
  phone.addEventListener('change', onPhoneChange);

  syncPins(new Set());
  map.on('render', draw);
  /* The map may have drawn its last frame before this attached; an idle map
     draws nothing until asked. */
  map.triggerRepaint();

  return () => {
    map.off('render', draw);
    observer.disconnect();
    resize.disconnect();
    phone.removeEventListener('change', onPhoneChange);
    pins.replaceChildren();
    clones.clear();
  };
}
