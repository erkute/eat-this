'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export type SheetSnap = 'peek' | 'mid' | 'full';

// Default peek = grab handle plus breathing room; the detail view raises it via
// SheetConfig.
const DEFAULT_PEEK_VISIBLE_PX = 40;
const MID_VISIBLE_PX = 420;
// 'full' stops 40 px below the top so a strip of map stays visible.
const FULL_TOP_PX = 40;
const MOBILE_MAX = 1023.98;
/* Phones render list and detail as window-scrolled documents (so their content
   shows through iOS Safari's URL bar); the hook must be fully inert there,
   since its touchmove preventDefault would swallow window scroll. Short
   landscape panels scroll natively too. */
const NATIVE_SCROLL_LAYOUT =
  '(max-width: 767.98px), (orientation: landscape) and (max-height: 500px) and (min-width: 600px) and (max-width: 1023.98px)';

function snapToPx(snap: SheetSnap, sheetH: number, peekPx: number): number {
  switch (snap) {
    case 'full':
      return FULL_TOP_PX;
    case 'mid':
      return Math.max(0, sheetH - Math.min(MID_VISIBLE_PX, sheetH / 2));
    case 'peek':
      return Math.max(0, sheetH - peekPx);
  }
}

function pxToNearestSnap(
  px: number,
  sheetH: number,
  peekPx: number,
  allowed: SheetSnap[] = ['full', 'mid', 'peek']
): SheetSnap {
  let best: SheetSnap = allowed[allowed.length - 1];
  let bestDist = Infinity;
  for (const s of allowed) {
    const d = Math.abs(snapToPx(s, sheetH, peekPx) - px);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

/* Snap after a drag: direction plus distance. Direction alone caps every drag
   at one step; distance alone makes small swipes feel ignored. A move of ≥ 40
   px or a flick (≥ 0.4 px/ms) guarantees one step in its direction, and the
   nearest snap wins if the finger went further. */
const INTENT_THRESHOLD_PX = 40;
const FLICK_VELOCITY_PX_MS = 0.4;

function pickSnapAfterDrag(
  startSnap: SheetSnap,
  dy: number,
  velocity: number,
  finalPx: number,
  sheetH: number,
  peekPx: number,
  allowed: SheetSnap[]
): SheetSnap {
  const order: SheetSnap[] = ['full', 'mid', 'peek'].filter((s): s is SheetSnap =>
    allowed.includes(s as SheetSnap)
  );
  const startIdx = order.indexOf(startSnap);
  const nearest = pxToNearestSnap(finalPx, sheetH, peekPx, allowed);
  const nearestIdx = order.indexOf(nearest);

  const flick = Math.abs(velocity) >= FLICK_VELOCITY_PX_MS;
  if ((Math.abs(dy) < INTENT_THRESHOLD_PX && !flick) || startIdx === -1) {
    return nearest;
  }

  // A flick's direction wins over net displacement (the finger may have doubled
  // back).
  const dir = flick ? (velocity < 0 ? -1 : 1) : dy < 0 ? -1 : 1;
  const intentIdx = Math.max(0, Math.min(order.length - 1, startIdx + dir));

  const finalIdx = dir < 0 ? Math.min(intentIdx, nearestIdx) : Math.max(intentIdx, nearestIdx);
  return order[finalIdx];
}

function dismissGesture(
  cfg: SheetConfig,
  finalPx: number,
  dy: number,
  vel: number,
  sheetH: number
): boolean {
  if (!cfg.onDismiss || dy <= 0) return false;
  // Dismiss only when swiped almost to the bottom (past ~92 % of the range
  // below peek); position only, so a quick swipe that stops higher does not
  // dismiss.
  void vel;
  const peekTopPx = snapToPx('peek', sheetH, cfg.peekVisiblePx);
  const bottomPx = sheetH - 40;
  const belowPeekRange = bottomPx - peekTopPx;
  const overshoot = finalPx - peekTopPx;
  return belowPeekRange > 0 && overshoot > belowPeekRange * 0.92;
}

/* Release velocity (px/ms, positive = down), smoothed so a single jittery event
   does not dominate. */
interface VelocityState {
  lastY: number;
  lastT: number;
  vel: number;
}

function velocityInit(y: number, t: number): VelocityState {
  return { lastY: y, lastT: t, vel: 0 };
}

function velocitySample(v: VelocityState, y: number, t: number): void {
  const dt = t - v.lastT;
  if (dt <= 0) return;
  const inst = (y - v.lastY) / dt;
  v.vel = v.vel * 0.4 + inst * 0.6;
  v.lastY = y;
  v.lastT = t;
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;
}

function usesNativeScroll(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(NATIVE_SCROLL_LAYOUT).matches;
}

/* Snaps anchor to the visible viewport height, not the sheet's: the sheet is
   100lvh with an overhang into iOS Safari's URL-bar zone, and measuring it
   would push every snap down by the bar height. */
function visibleViewportH(): number {
  return window.innerHeight;
}

interface SheetConfig {
  maxSnap: SheetSnap | null;
  // Explicit rest points; overrides the maxSnap-derived list (the detail rests
  // at 'full' or 'peek').
  snaps?: SheetSnap[];
  dragMode: 'all' | 'handleOnly' | 'none';
  peekVisiblePx: number;
  // A strong pull past 'peek' calls this instead of parking at 'peek'.
  onDismiss?: () => void;
  inflow?: boolean;
}

function dragPx(cfg: SheetConfig, sheetH: number, basePx: number, dy: number): number {
  const upperCap = cfg.maxSnap ? snapToPx(cfg.maxSnap, sheetH, cfg.peekVisiblePx) : FULL_TOP_PX;
  return Math.max(upperCap, Math.min(sheetH - 40, basePx + dy));
}

function releaseTarget(
  cfg: SheetConfig,
  sheetH: number,
  startSnap: SheetSnap,
  basePx: number,
  dy: number,
  vel: number
): SheetSnap | 'dismiss' {
  const finalPx = dragPx(cfg, sheetH, basePx, dy);
  if (dismissGesture(cfg, finalPx, dy, vel, sheetH)) return 'dismiss';
  const allowed: SheetSnap[] =
    cfg.snaps ?? (cfg.maxSnap ? ['mid', 'peek'] : ['full', 'mid', 'peek']);
  return pickSnapAfterDrag(startSnap, dy, vel, finalPx, sheetH, cfg.peekVisiblePx, allowed);
}

export function useBottomSheet(initial: SheetSnap = 'peek') {
  const [snap, setSnap] = useState<SheetSnap>(initial);
  const [dragging, setDragging] = useState(false);
  const [nativeScrollLayout, setNativeScrollLayout] = useState(usesNativeScroll);
  useEffect(() => {
    const media = window.matchMedia(NATIVE_SCROLL_LAYOUT);
    const sync = () => setNativeScrollLayout(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  const [sheetMounted, setSheetMounted] = useState(false);
  // Bumped when the content element re-mounts, so the touch effect rebinds to
  // the new element.
  const [contentTick, setContentTick] = useState(0);
  const [headerTick, setHeaderTick] = useState(0);
  const sheetNode = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  // Secondary drag zone (the list header); a movement threshold keeps taps on
  // its buttons working.
  const headerRef = useRef<HTMLDivElement | null>(null);
  const setContentRef = useCallback((el: HTMLDivElement | null) => {
    if (el !== contentRef.current) {
      contentRef.current = el;
      setContentTick((t) => t + 1);
    }
  }, []);
  const setHeaderRef = useCallback((el: HTMLDivElement | null) => {
    if (el !== headerRef.current) {
      headerRef.current = el;
      setHeaderTick((t) => t + 1);
    }
  }, []);
  const dragRef = useRef<{
    startY: number;
    basePx: number;
    pointerId: number;
    v: VelocityState;
  } | null>(null);
  const snapRef = useRef<SheetSnap>(initial);
  const configRef = useRef<SheetConfig>({
    maxSnap: null,
    dragMode: 'all',
    peekVisiblePx: DEFAULT_PEEK_VISIBLE_PX,
  });
  snapRef.current = snap;

  const configure = useCallback((cfg: Partial<SheetConfig>) => {
    configRef.current = { ...configRef.current, ...cfg };
  }, []);

  // MapLibre mounts its controls asynchronously, usually after the first
  // applyY; the last offset is re-applied when they appear.
  const lastControlOffsetRef = useRef<number>(0);
  const ctrlRetryTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const updateControls = useCallback((root: HTMLElement, offsetPx: number) => {
    root
      .querySelectorAll<HTMLElement>('.maplibregl-ctrl-bottom-right, .maplibregl-ctrl-bottom-left')
      .forEach((c) => {
        c.style.bottom = `${offsetPx}px`;
      });
  }, []);

  /* 'drag' writes only the element's transform (60×/s, must stay cheap); 'snap'
     also writes --sheet-visible-px and re-offsets the MapLibre controls. */
  const sheetHRef = useRef<number>(0);

  /* iOS Safari fires touchmove faster than 60 Hz on some devices; one write per
     animation frame is all anyone can see. */
  const rafPxRef = useRef<number | null>(null);
  const rafIdRef = useRef<number>(0);

  const applyYDrag = useCallback((px: number) => {
    rafPxRef.current = px;
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      const target = rafPxRef.current;
      rafIdRef.current = 0;
      rafPxRef.current = null;
      if (target === null) return;
      const el = sheetNode.current;
      if (!el) return;
      // An inherited CSS variable would invalidate the whole sheet subtree.
      el.style.transform = `translateY(${target}px)`;
    });
  }, []);

  /* Must run before setSnap, or a queued frame overwrites the snap with the
     last drag position. */
  const cancelDragRaf = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    rafPxRef.current = null;
  }, []);

  useEffect(() => {
    if (!nativeScrollLayout || !configRef.current.inflow) return;
    cancelDragRaf();
    dragRef.current = null;
    sheetNode.current?.style.removeProperty('transform');
    setDragging(false);
  }, [nativeScrollLayout, cancelDragRaf]);

  const applyY = useCallback(
    (px: number) => {
      const el = sheetNode.current;
      if (!el) return;
      if (configRef.current.inflow && usesNativeScroll()) return;
      el.style.removeProperty('transform');
      el.style.setProperty('--sheet-y', `${px}px`);
      const h = visibleViewportH();
      sheetHRef.current = h;
      const visible = Math.max(0, h - px);
      el.style.setProperty('--sheet-visible-px', `${visible}px`);
      const parent = el.parentElement;
      if (parent) {
        parent.style.setProperty('--sheet-visible-px', `${visible}px`);
        /* Controls sit in the 100lvh map body; lift them past the URL-bar
           overhang. */
        const overhang = Math.max(0, parent.getBoundingClientRect().height - h);
        const offset = visible + 10 + overhang;
        lastControlOffsetRef.current = offset;
        updateControls(parent, offset);
        ctrlRetryTimers.current.forEach(clearTimeout);
        ctrlRetryTimers.current = [
          setTimeout(() => updateControls(parent, offset), 200),
          setTimeout(() => updateControls(parent, offset), 800),
        ];
      }
    },
    [updateControls]
  );

  useEffect(() => {
    const el = sheetNode.current;
    const parent = el?.parentElement;
    if (!parent) return;
    const apply = () => {
      let offset = lastControlOffsetRef.current;
      if (!offset && el && isMobile() && !(configRef.current.inflow && usesNativeScroll())) {
        const h = visibleViewportH();
        const px = snapToPx(snapRef.current, h, configRef.current.peekVisiblePx);
        const overhang = Math.max(0, parent.getBoundingClientRect().height - h);
        offset = Math.max(0, h - px) + 10 + overhang;
      }
      if (offset) updateControls(parent, offset);
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(parent, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [updateControls]);

  // Callback ref: plain refs and effects race against the parent's loading gate
  // that defers mounting the sheet.
  const sheetRef = useCallback(
    (el: HTMLDivElement | null) => {
      sheetNode.current = el;
      if (el) {
        setSheetMounted(true);
      }
      if (el && isMobile() && !(configRef.current.inflow && usesNativeScroll())) {
        const h = visibleViewportH();
        const px = snapToPx(snapRef.current, h, configRef.current.peekVisiblePx);
        const visible = Math.max(0, h - px);
        el.style.setProperty('--sheet-y', `${px}px`);
        el.style.setProperty('--sheet-visible-px', `${visible}px`);
        const parent = el.parentElement;
        if (parent) {
          parent.style.setProperty('--sheet-visible-px', `${visible}px`);
          const overhang = Math.max(0, parent.getBoundingClientRect().height - h);
          const offset = visible + 10 + overhang;
          lastControlOffsetRef.current = offset;
          updateControls(parent, offset);
          // MapLibre may still be mounting its controls.
          ctrlRetryTimers.current.forEach(clearTimeout);
          ctrlRetryTimers.current = [
            setTimeout(() => updateControls(parent, offset), 250),
            setTimeout(() => updateControls(parent, offset), 1000),
          ];
        }
      }
    },
    [updateControls]
  );

  useEffect(() => {
    if (dragging) return;
    const el = sheetNode.current;
    if (!el || !isMobile()) return;
    applyY(snapToPx(snap, visibleViewportH(), configRef.current.peekVisiblePx));
  }, [snap, dragging, applyY]);

  useEffect(() => {
    const onResize = () => {
      const el = sheetNode.current;
      if (!el || !isMobile()) return;
      applyY(snapToPx(snap, visibleViewportH(), configRef.current.peekVisiblePx));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [snap, applyY]);

  useEffect(() => {
    const handle = handleRef.current;
    const sheet = sheetNode.current;
    if (!handle || !sheet) return;
    if (configRef.current.inflow && nativeScrollLayout) return;

    const onDown = (e: PointerEvent) => {
      if (!isMobile() || configRef.current.dragMode === 'none') return;
      if (configRef.current.inflow && usesNativeScroll()) return;
      const h = visibleViewportH();
      sheetHRef.current = h;
      const cssY = sheet.style.getPropertyValue('--sheet-y');
      const basePx = cssY ? parseFloat(cssY) : snapToPx(snap, h, configRef.current.peekVisiblePx);
      dragRef.current = {
        startY: e.clientY,
        basePx,
        pointerId: e.pointerId,
        v: velocityInit(e.clientY, e.timeStamp),
      };
      handle.setPointerCapture(e.pointerId);
      setDragging(true);
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      velocitySample(d.v, e.clientY, e.timeStamp);
      applyYDrag(dragPx(configRef.current, sheetHRef.current, d.basePx, e.clientY - d.startY));
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      try {
        handle.releasePointerCapture(d.pointerId);
      } catch {
        /* noop */
      }
      cancelDragRaf();
      const dy = e.clientY - d.startY;
      const displacement = Math.abs(dy);
      dragRef.current = null;
      setDragging(false);
      // A tap from peek expands one step: 'mid' in the list, 'full' in the
      // detail ('mid' is no rest point there).
      if (displacement < 6 && e.type === 'pointerup') {
        const allowed = configRef.current.snaps ?? ['full', 'mid', 'peek'];
        setSnap(snapRef.current === 'peek' ? (allowed.includes('mid') ? 'mid' : 'full') : 'peek');
        return;
      }
      const target = releaseTarget(
        configRef.current,
        sheetHRef.current,
        snapRef.current,
        d.basePx,
        dy,
        d.v.vel
      );
      if (target === 'dismiss') configRef.current.onDismiss?.();
      else setSnap(target);
    };

    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
    return () => {
      handle.removeEventListener('pointerdown', onDown);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
    };
  }, [snap, applyYDrag, cancelDragRaf, sheetMounted, nativeScrollLayout]);

  // Content drag: at 'peek' in any direction; at 'mid'/'full' only downward and
  // only with the list scrolled to the top, so native scrolling keeps working.
  useEffect(() => {
    void contentTick;
    const content = contentRef.current;
    const sheet = sheetNode.current;
    if (!content || !sheet) return;
    if (!isMobile()) return;
    if (configRef.current.inflow && nativeScrollLayout) return;

    let touchState: {
      startY: number;
      startX: number;
      basePx: number;
      active: boolean;
      atScrollTop: boolean;
      nativeScrollOnUp: boolean;
      v: VelocityState;
    } | null = null;

    const cancelTouchDrag = () => {
      if (touchState?.active) {
        cancelDragRaf();
        setDragging(false);
      }
      touchState = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (configRef.current.dragMode !== 'all') return;
      if (configRef.current.inflow && usesNativeScroll()) return;
      if (e.touches.length !== 1) {
        cancelTouchDrag();
        return;
      }
      const h = visibleViewportH();
      sheetHRef.current = h;
      /* The detail's real scroller is nested ([data-detail-scroll]); the outer
         wrapper never scrolls. */
      const scroller = content.querySelector<HTMLElement>('[data-detail-scroll]') ?? content;
      touchState = {
        startY: e.touches[0].clientY,
        startX: e.touches[0].clientX,
        basePx: snapToPx(snapRef.current, h, configRef.current.peekVisiblePx),
        active: false,
        atScrollTop: scroller.scrollTop <= 0,
        nativeScrollOnUp: !!(e.target as Element | null)?.closest?.('[data-sheet-scroll-native]'),
        v: velocityInit(e.touches[0].clientY, e.timeStamp),
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState) return;
      if (e.touches.length !== 1) {
        cancelTouchDrag();
        return;
      }
      const dy = e.touches[0].clientY - touchState.startY;
      velocitySample(touchState.v, e.touches[0].clientY, e.timeStamp);
      if (!touchState.active) {
        const dx = e.touches[0].clientX - touchState.startX;
        if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
        /* Axis lock: a horizontal start belongs to a scroller inside the sheet. */
        if (Math.abs(dx) > Math.abs(dy)) {
          touchState = null;
          return;
        }
        /* Sheet drag vs. content scroll: at 'full' an upward swipe scrolls
           content; scroll-native islands scroll upward from 'mid' too; a
           downward swipe with content scrolled scrolls content. Otherwise the
           sheet moves. */
        const atFull = snapRef.current === 'full';
        if (atFull && dy < 0) {
          touchState = null;
          return;
        }
        if (touchState.nativeScrollOnUp && dy < 0) {
          touchState = null;
          return;
        }
        if (dy > 0 && !touchState.atScrollTop) {
          touchState = null;
          return;
        }
        touchState.active = true;
        setDragging(true);
      }
      e.preventDefault();
      applyYDrag(dragPx(configRef.current, sheetHRef.current, touchState.basePx, dy));
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchState) return;
      if (touchState.active) {
        cancelDragRaf();
        const dy = (e.changedTouches[0]?.clientY ?? touchState.startY) - touchState.startY;
        setDragging(false);
        const target = releaseTarget(
          configRef.current,
          sheetHRef.current,
          snapRef.current,
          touchState.basePx,
          dy,
          touchState.v.vel
        );
        if (target === 'dismiss') configRef.current.onDismiss?.();
        else setSnap(target);
      }
      touchState = null;
    };

    content.addEventListener('touchstart', onTouchStart, { passive: true });
    content.addEventListener('touchmove', onTouchMove, { passive: false });
    content.addEventListener('touchend', onTouchEnd);
    content.addEventListener('touchcancel', cancelTouchDrag);
    return () => {
      content.removeEventListener('touchstart', onTouchStart);
      content.removeEventListener('touchmove', onTouchMove);
      content.removeEventListener('touchend', onTouchEnd);
      content.removeEventListener('touchcancel', cancelTouchDrag);
    };
  }, [applyYDrag, cancelDragRaf, snap, contentTick, nativeScrollLayout]);

  useEffect(() => {
    void headerTick;
    const header = headerRef.current;
    const sheet = sheetNode.current;
    if (!header || !sheet) return;
    if (!isMobile()) return;
    if (configRef.current.dragMode !== 'all') return;
    if (configRef.current.inflow && nativeScrollLayout) return;

    let touchState: {
      startY: number;
      startX: number;
      basePx: number;
      active: boolean;
      v: VelocityState;
    } | null = null;

    const cancelTouchDrag = () => {
      if (touchState?.active) {
        cancelDragRaf();
        setDragging(false);
      }
      touchState = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (configRef.current.dragMode !== 'all') return;
      if (configRef.current.inflow && usesNativeScroll()) return;
      if (e.touches.length !== 1) {
        cancelTouchDrag();
        return;
      }
      const h = visibleViewportH();
      sheetHRef.current = h;
      touchState = {
        startY: e.touches[0].clientY,
        startX: e.touches[0].clientX,
        basePx: snapToPx(snapRef.current, h, configRef.current.peekVisiblePx),
        active: false,
        v: velocityInit(e.touches[0].clientY, e.timeStamp),
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState) return;
      if (e.touches.length !== 1) {
        cancelTouchDrag();
        return;
      }
      const dy = e.touches[0].clientY - touchState.startY;
      velocitySample(touchState.v, e.touches[0].clientY, e.timeStamp);
      if (!touchState.active) {
        const dx = e.touches[0].clientX - touchState.startX;
        // Below 8 px it is a tap; leave the click to the buttons inside.
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
        /* Axis lock: a horizontal start belongs to the chip rail (pan-x), or
           both would move. */
        if (Math.abs(dx) > Math.abs(dy)) {
          touchState = null;
          return;
        }
        touchState.active = true;
        setDragging(true);
      }
      if (e.cancelable) e.preventDefault();
      applyYDrag(dragPx(configRef.current, sheetHRef.current, touchState.basePx, dy));
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchState) return;
      if (touchState.active) {
        cancelDragRaf();
        const dy = (e.changedTouches[0]?.clientY ?? touchState.startY) - touchState.startY;
        setDragging(false);
        const target = releaseTarget(
          configRef.current,
          sheetHRef.current,
          snapRef.current,
          touchState.basePx,
          dy,
          touchState.v.vel
        );
        if (target === 'dismiss') configRef.current.onDismiss?.();
        else setSnap(target);
      }
      touchState = null;
    };

    header.addEventListener('touchstart', onTouchStart, { passive: true });
    header.addEventListener('touchmove', onTouchMove, { passive: false });
    header.addEventListener('touchend', onTouchEnd);
    header.addEventListener('touchcancel', cancelTouchDrag);
    return () => {
      header.removeEventListener('touchstart', onTouchStart);
      header.removeEventListener('touchmove', onTouchMove);
      header.removeEventListener('touchend', onTouchEnd);
      header.removeEventListener('touchcancel', cancelTouchDrag);
    };
  }, [applyYDrag, cancelDragRaf, snap, headerTick, nativeScrollLayout]);

  const collapse = useCallback(() => setSnap('peek'), []);
  const expand = useCallback(() => setSnap('mid'), []);

  // Applies a snap even when setSnap(s) is a no-op because s is current.
  const reapplySnap = useCallback(
    (target: SheetSnap) => {
      const el = sheetNode.current;
      if (!el || !isMobile()) return;
      applyY(snapToPx(target, visibleViewportH(), configRef.current.peekVisiblePx));
      snapRef.current = target;
    },
    [applyY]
  );

  return {
    sheetRef,
    handleRef,
    contentRef,
    setContentRef,
    setHeaderRef,
    snap,
    setSnap,
    dragging,
    collapse,
    expand,
    reapplySnap,
    configure,
  };
}
