'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  measureSheetTop,
  resolveToggleMode,
  snapOffsets,
  type ToggleMode,
} from '@/lib/map/phoneSheetSnaps';
import type { SheetView } from '@/lib/map';
import { trackEvent } from '@/lib/analytics';
import styles from './MapViewToggle.module.css';

const PHONE_MAX = 767.98;
/* Close enough to the destination to call a programmatic scroll finished. */
const ARRIVAL_PX = 8;
/* Smooth scrolling has no completion event. If the target turns out to be
   unreachable (the document shrank under us) the lock releases anyway. */
const SETTLE_TIMEOUT_MS = 1200;
/* How long without a scroll event before the list counts as standing still and
   the pill comes back.

   This delay is felt directly — it is the wait between letting go and the pill
   returning — so it is much shorter than a lingering timeout would need to be.
   It cannot go to zero either: a deliberate swipe-swipe-swipe leaves gaps of a
   couple hundred ms with no events, and the pill flashing in and out through
   each of them is worse than either state. iOS momentum keeps firing while it
   glides, so the clock effectively starts when the list truly stops. */
const AT_REST_MS = 500;

interface Props {
  /** The pill is a phone-list affordance; the detail keeps it parked. */
  sheetView: SheetView;
  /** Signature of the active filters. Drops the remembered position whenever
   *  they change — a scroll offset into the old list means nothing in the new
   *  one. Deliberately the FILTERS and not the result count: two filters can
   *  yield the same number of rows, and the count also churns while the map
   *  data streams in, which would wipe a perfectly good position. */
  filterKey: string;
}

/**
 * "Karte ⇄ Liste" — the phone list's way back to the map and back again.
 *
 * On phones the list is a window-scrolled document with the map as a sticky
 * layer behind it (see phoneSheetSnaps.ts), so both directions are nothing but
 * a scroll: the map never unmounts and the camera never moves. The pill only
 * remembers where you left the list, which is what makes it a toggle rather
 * than a one-way scroll-to-top.
 *
 * It stands aside while you scroll. Two conditions, kept separate on purpose:
 * `mode` is whether there is anywhere to go, `scrolling` is whether you are
 * busy going there. Mid-flick the pill slides out from over the list; the
 * moment the list comes to rest it slides back, which is also the moment you
 * are in a position to read it and decide.
 *
 * `tabIndex` and `aria-hidden` follow the same flag, so the pill is never a
 * tab stop while it is off screen — with one exception, see `focused`.
 */
export default function MapViewToggle({ sheetView, filterKey }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ToggleMode>(null);
  /* The pill gets out of the way while the list is moving and comes back once
     it stops. `mode` still decides WHETHER there is anywhere to go and in which
     direction — this only decides whether the offer is on screen right now. */
  const [scrolling, setScrolling] = useState(false);
  /* ...with one exception. A pill that vanished out from under the keyboard
     would take the focus ring with it and leave focus on an inert, invisible
     element. While it is focused it stays put, moving or not. */
  const [focused, setFocused] = useState(false);
  const idleTimer = useRef<number | null>(null);
  /* Where the list was when the map was last requested. null = nothing to go
     back to, which is also what hides the 'toList' direction. */
  const rememberedListY = useRef<number | null>(null);
  /* Destination of a scroll we started ourselves. While set, the scroll
     handler leaves `mode` alone so the label cannot flicker mid-flight. */
  const pending = useRef<{ target: number; mode: ToggleMode } | null>(null);
  const settleTimer = useRef<number | null>(null);

  const sheetViewRef = useRef(sheetView);
  sheetViewRef.current = sheetView;

  /* Cached stops. measureSheetTop() reads a bounding rect, so recomputing it on
     every scroll event would force a layout on each frame of a list scroll —
     the one place on this page where that is guaranteed to be felt. The stops
     only move when the viewport or the sheet's own geometry does, so they are
     cached and the scroll path is pure arithmetic. */
  const offsets = useRef<number[] | null>(null);

  const measure = useCallback(() => {
    offsets.current = snapOffsets('list', window.innerHeight, measureSheetTop());
    return offsets.current;
  }, []);

  const evaluate = useCallback(
    (remeasure = true) => {
      if (sheetViewRef.current !== 'list') {
        setMode(null);
        return;
      }
      if (!window.matchMedia(`(max-width: ${PHONE_MAX}px)`).matches) {
        setMode(null);
        return;
      }
      const stops = remeasure || !offsets.current ? measure() : offsets.current;
      const next = resolveToggleMode(stops, window.scrollY, rememberedListY.current != null);
      /* Cached stops can be stale — the cookie banner lifting the sheet moves
         them without a resize. Only a flip is worth re-measuring for: it is the
         one moment the exact stop matters, and it happens at most twice per
         trip down the list. */
      if (next === mode || remeasure) {
        setMode(next);
        return;
      }
      setMode(resolveToggleMode(measure(), window.scrollY, rememberedListY.current != null));
    },
    [measure, mode]
  );

  const evaluateRef = useRef(evaluate);
  evaluateRef.current = evaluate;

  useEffect(() => {
    const onScroll = () => {
      setScrolling(true);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setScrolling(false), AT_REST_MS);

      const flight = pending.current;
      if (flight) {
        /* Our own scroll is still travelling — leave the label alone so it
           cannot flicker through a third state on the way. */
        if (Math.abs(window.scrollY - flight.target) > ARRIVAL_PX) return;
        pending.current = null;
      }
      evaluateRef.current(false);
    };
    const onResize = () => evaluateRef.current(true);

    evaluateRef.current(true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  /* Re-read on every view switch. The detail parks the pill; coming back has
     to re-derive it from wherever MapSection restored the scroll to. The
     remembered position deliberately SURVIVES the detour — opening a spot and
     closing it again should not cost you your place in the list. */
  useEffect(() => {
    evaluateRef.current(true);
  }, [sheetView]);

  useEffect(() => {
    rememberedListY.current = null;
    evaluateRef.current(true);
  }, [filterKey]);

  useEffect(
    () => () => {
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    },
    []
  );

  const scrollTo = useCallback(
    (target: number, nextMode: ToggleMode) => {
      pending.current = { target, mode: nextMode };
      setMode(nextMode);
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => {
        pending.current = null;
        evaluateRef.current(true);
      }, SETTLE_TIMEOUT_MS);
      window.scrollTo({
        top: target,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
    },
    []
  );

  const handleClick = useCallback(() => {
    const stops = measure();
    if (mode === 'toMap') {
      rememberedListY.current = window.scrollY;
      trackEvent('map_view_toggle', { direction: 'to_map' });
      scrollTo(stops[0], 'toList');
      return;
    }
    const back = rememberedListY.current;
    if (back == null) return;
    /* The document can be shorter than when we left — a clamp keeps the
       restore inside it instead of silently landing at the bottom. */
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    trackEvent('map_view_toggle', { direction: 'to_list' });
    scrollTo(Math.min(back, maxY), 'toMap');
  }, [measure, mode, scrollTo]);

  const toMap = mode === 'toMap';
  const label = toMap ? t('map.viewToggleMap') : t('map.viewToggleList');
  const visible = Boolean(mode) && (!scrolling || focused);

  return (
    <button
      type="button"
      className={styles.toggle}
      data-visible={visible ? 'true' : undefined}
      data-map-view-toggle=""
      /* Kept mounted so the remembered position outlives a detail detour; the
         hidden state is inert rather than unmounted. Tab order and the
         accessibility tree follow what is actually on screen — a pill hidden
         mid-scroll is as unreachable as a mode-less one. */
      tabIndex={visible ? undefined : -1}
      aria-hidden={visible ? undefined : true}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={handleClick}
    >
      <span className={styles.icon} aria-hidden="true">
        {toMap ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
            <path
              d="M9 3.6 3.8 5.8v14.6L9 18.2l6 2.2 5.2-2.2V3.6L15 5.8 9 3.6Z"
              strokeLinejoin="round"
            />
            <path d="M9 3.6v14.6M15 5.8v14.6" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
            <path d="M4 6.6h16M4 12h16M4 17.4h11" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
