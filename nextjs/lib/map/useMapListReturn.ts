'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { SheetView } from './useMapSheet';
import type { ListCenter } from './listCenter';
import {
  phoneListMidVisiblePx, resolveListReturn, rowRevealOffset, rowRevealTop, type DetailOrigin,
} from './phoneSheetSnaps';
import { isPhoneViewport } from './viewport';

type Anchor = 'peek' | 'mid' | 'full';
function anchorY(sheet: HTMLElement | null, target: Anchor): number | null {
  if (!sheet) return null;
  const top = sheet.getBoundingClientRect().top + window.scrollY;
  const height = window.innerHeight;
  const desired = target === 'peek' ? height : target === 'mid'
    ? Math.max(40, height - phoneListMidVisiblePx(height)) : 40;
  return Math.max(0, Math.round(top - desired));
}

/** Shared by sheet controls and URL history without owning either's state. */
export function useMapListAnchor(sheetElRef: RefObject<HTMLElement | null>) {
  return useCallback((target: Anchor, behavior: ScrollBehavior = 'smooth') => {
    const top = anchorY(sheetElRef.current, target);
    if (top !== null) window.scrollTo({ top, behavior });
  }, [sheetElRef]);
}

interface Options {
  sheetView: SheetView;
  initialDetail: boolean;
  sheetElRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  filterKey: string;
  listCenter: ListCenter | null;
  history: {
    detailEntryPushedRef: RefObject<boolean>;
    detailClosedBySearchRef: RefObject<boolean>;
    listAnchorPendingRef: RefObject<boolean>;
  };
  scrollToAnchor: ReturnType<typeof useMapListAnchor>;
}

/** Remembers the departure point and owns list restoration across detail/history transitions. */
export function useMapListReturn({ sheetView, initialDetail, sheetElRef, contentRef,
  filterKey, listCenter, history, scrollToAnchor }: Options) {
  const { detailEntryPushedRef, detailClosedBySearchRef, listAnchorPendingRef } = history;
  const origin = useRef<DetailOrigin>('list');
  const offset = useRef(0);
  const rowTop = useRef<number | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusRef = useRef(focusId);
  focusRef.current = focusId;
  const cancelReveal = useRef<(() => void) | null>(null);

  const remember = useCallback((from: DetailOrigin, rowId: string | null) => {
    origin.current = from;
    const phone = isPhoneViewport();
    offset.current = phone ? window.scrollY : (contentRef.current?.scrollTop ?? 0);
    const row = rowId ? document.querySelector<HTMLElement>(`[data-list-row="${rowId}"]`) : null;
    rowTop.current = row
      ? row.getBoundingClientRect().top - (phone ? 0 : (contentRef.current?.getBoundingClientRect().top ?? 0))
      : null;
  }, [contentRef]);
  const getOrigin = useCallback(() => origin.current, []);
  const returnToRow = useCallback((id: string | null) => {
    setFocusId(origin.current === 'map' ? null : id);
  }, []);

  // Re-aim while appended/re-sorted rows settle. Touch or wheel immediately
  // returns control to the visitor; a bounded loop cannot fight scrolling.
  const revealRow = useCallback((id: string | null): boolean => {
    if (!id) return false;
    const find = () => document.querySelector<HTMLElement>(`[data-list-row="${id}"]`);
    if (!find()) return false;
    cancelReveal.current?.();
    let frames = 0;
    let settled = 0;
    let raf = 0;
    const cancel = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchstart', cancel);
      cancelReveal.current = null;
    };
    cancelReveal.current = cancel;
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchstart', cancel, { passive: true });
    const tick = () => {
      const row = find();
      if (!row) return cancel();
      const phone = isPhoneViewport();
      const port = phone ? null : contentRef.current;
      let target: number;
      let current: number;
      if (port) {
        const top = row.getBoundingClientRect().top - port.getBoundingClientRect().top + port.scrollTop;
        target = Math.max(0, Math.round(top - rowRevealTop(port.clientHeight, rowTop.current)));
        current = port.scrollTop;
      } else {
        if (!phone) return cancel();
        const minY = anchorY(sheetElRef.current, 'mid');
        if (minY === null) return cancel();
        target = rowRevealOffset(row.getBoundingClientRect().top + window.scrollY,
          window.innerHeight, minY, rowTop.current);
        current = window.scrollY;
      }
      if (Math.abs(current - target) > 1) {
        settled = 0;
        if (port) port.scrollTop = target;
        else window.scrollTo({ top: target, behavior: 'instant' });
      } else if (++settled >= 3) return cancel();
      if (++frames >= 60) return cancel();
      raf = requestAnimationFrame(tick);
    };
    tick();
    return true;
  }, [contentRef, sheetElRef]);

  useEffect(() => () => cancelReveal.current?.(), []);
  const previousFilter = useRef(filterKey);
  useEffect(() => {
    if (sheetView !== 'list') return;
    const changed = previousFilter.current !== filterKey;
    previousFilter.current = filterKey;
    if (!changed) return;
    offset.current = 0;
    setFocusId(null);
    if (isPhoneViewport()) {
      const top = anchorY(sheetElRef.current, 'full');
      if (top !== null && window.scrollY > top) window.scrollTo(0, top);
    } else if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [sheetView, filterKey, contentRef, sheetElRef]);

  const previousView = useRef<SheetView>(initialDetail ? 'detail' : 'list');
  useLayoutEffect(() => {
    const cameFromDetail = previousView.current === 'detail';
    previousView.current = sheetView;
    if (sheetView !== 'list') return;
    const action = resolveListReturn(offset.current, cameFromDetail, origin.current);
    if (action === 'stay') return;
    if (action === 'toMap') {
      listAnchorPendingRef.current = false;
      if (isPhoneViewport()) window.scrollTo(0, 0);
      return;
    }
    if (isPhoneViewport()) {
      if (action === 'toList') {
        // A pushed detail must let history's scroll restoration finish first.
        // The selection's popstate listener consumes the pending anchor.
        if (detailEntryPushedRef.current && !detailClosedBySearchRef.current) {
          listAnchorPendingRef.current = true;
          return;
        }
        scrollToAnchor('mid', 'instant');
        return;
      }
      if (!revealRow(focusRef.current)) window.scrollTo(0, offset.current);
      return;
    }
    const port = contentRef.current;
    if (action !== 'restore') {
      if (port) port.scrollTop = 0;
    } else if (!revealRow(focusRef.current) && port) port.scrollTop = offset.current;
  }, [sheetView, contentRef, revealRow, scrollToAnchor,
    detailEntryPushedRef, detailClosedBySearchRef, listAnchorPendingRef]);

  const view = useRef(sheetView);
  view.current = sheetView;
  useEffect(() => {
    if (!listCenter || view.current !== 'list') return;
    setFocusId(null);
    if (!isPhoneViewport() && contentRef.current) contentRef.current.scrollTop = 0;
  }, [listCenter, contentRef]);

  return { focusId, remember, returnToRow, getOrigin };
}
