'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { MapMustEat, MapRestaurant } from '@/lib/types';
import type { SheetView } from './useMapSheet';
import { freshestMustEat } from './freshestMustEat';
import { resolveAdjacent, resolvePagerAdjacent } from './pager';
import { prefetchRestaurantDetail } from './useRestaurantDetail';
import { currentUrl, urlWithParams } from './mapFilterParams';
import { resolveDetailHistory } from './detailHistory';

/** How a spot named by the URL gets opened: MapSection's own open handlers. */
export interface DetailOpeners {
  restaurant: (restaurant: MapRestaurant) => void;
  mustEat: (mustEat: MapMustEat) => void;
}

interface Options {
  isActive: boolean;
  /** The ?r= spot the server already rendered open, if any. */
  initialRestaurant: MapRestaurant | null;
  sheetView: SheetView;
  restaurants: MapRestaurant[];
  mustEats: MapMustEat[];
  /** The list as the user sees it right now — what the pager freezes. */
  listRestaurants: MapRestaurant[];
  unlockedIds: Set<string>;
  scrollListToAnchor: (target: 'peek' | 'mid' | 'full', behavior?: ScrollBehavior) => void;
  /** Closes whichever detail is open (MapSection keeps it pointed right). */
  dismissDetailRef: RefObject<() => void>;
  openRef: RefObject<DetailOpeners>;
}

/**
 * Which detail is open and how it relates to the URL and the history stack:
 * the selection (restaurant or must-eat), both pagers, the ?r= / ?me= sync
 * with its history entry, and the back/forward gestures that close or reopen
 * a detail. Opening and closing themselves stay in MapSection — they move the
 * camera, the sheet and the list, which is MapSection's choreography.
 */
export function useDetailSelection({
  isActive,
  initialRestaurant,
  sheetView,
  restaurants,
  mustEats,
  listRestaurants,
  unlockedIds,
  scrollListToAnchor,
  dismissDetailRef,
  openRef,
}: Options) {
  /* Derive the deep-linked selection in the lazy state initializer so the
     server HTML and the first hydration render are both detail-first. Safari
     therefore receives the compact document geometry before its status-bar
     backdrop is established. */
  const [selectedRestaurant, setSelectedRestaurant] = useState<MapRestaurant | null>(
    () => initialRestaurant
  );
  const [selectedMustEat, setSelectedMustEat] = useState<MapMustEat | null>(null);

  /* Die Liste, aus der ein Detail geöffnet wurde, eingefroren für den Pager.
     Das Öffnen leert die Suche (siehe handleRestaurantClick in MapSection), und damit
     sprang `listRestaurants` sofort auf den vollen Datensatz zurück: wer
     „Pizza" suchte, das erste Ergebnis öffnete und weiterblätterte, landete
     beim Nachbarn aus der ungefilterten Liste statt beim zweiten Treffer.
     Jeder Öffnungsweg läuft durch handleRestaurantClick und setzt den
     Schnappschuss neu; Blättern lässt ihn stehen. */
  const [pagerList, setPagerList] = useState<MapRestaurant[] | null>(null);
  const listRestaurantsRef = useRef(listRestaurants);
  listRestaurantsRef.current = listRestaurants;
  const freezePager = useCallback(() => setPagerList(listRestaurantsRef.current), []);

  const sheetViewRef = useRef(sheetView);
  sheetViewRef.current = sheetView;
  /* Set when the trip to the list still has to survive a history traversal —
     consumed by the popstate handler further down. */
  const listAnchorPendingRef = useRef(false);

  /* Keep the open detail in the URL (?r=<slug> / ?me=<id>) so pull-to-refresh
     restores it via the existing deep-link path instead of dropping the user
     back to the list — and open details become shareable for free. The
     deep-link consumer (useMapDeepLinks) no longer strips the params; its
     consumed-guards prevent same-session re-triggers.

     Which history operation each change takes lives in resolveDetailHistory;
     detailEntryPushedRef is the one bit of state it needs — whether the entry
     on top of the stack is ours to unwind. */
  const detailEntryPushedRef = useRef(false);
  /* Gesetzt, wenn eine Sucheingabe das Detail schließt (siehe
     handleSearchChange in MapSection). Der normale Schließweg poppt unseren History-Eintrag,
     und der popstate wendet den ALTEN Filterzustand wieder an — die gerade
     getippte Query wäre damit im selben Moment weg, in dem sie die Liste
     zurückholt. In diesem einen Fall wird der Eintrag deshalb ersetzt statt
     gepoppt. */
  const detailClosedBySearchRef = useRef(false);
  const prevSheetViewRef = useRef<'list' | 'detail'>(initialRestaurant ? 'detail' : 'list');
  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;
    const wasDetail = prevSheetViewRef.current === 'detail';
    prevSheetViewRef.current = sheetView;
    const params = new URLSearchParams(window.location.search);
    const hasPendingDetailParam = params.has('r') || params.has('me');
    /* List view + a detail param + nothing selected is ambiguous: either a
       soft-navigated deep link useMapDeepLinks hasn't consumed yet (leave the
       param alone) or a detail the user just closed (strip it). wasDetail is
       what tells them apart — without it the close path bailed out here and
       left a stale ?r= behind, pointing at a spot that is no longer open. */
    if (
      sheetView !== 'detail' &&
      !wasDetail &&
      hasPendingDetailParam &&
      !selectedRestaurant?.slug &&
      !selectedMustEat?._id
    ) {
      return;
    }
    params.delete('r');
    params.delete('me');
    if (sheetView === 'detail') {
      if (selectedMustEat?._id) params.set('me', selectedMustEat._id);
      else if (selectedRestaurant?.slug) params.set('r', selectedRestaurant.slug);
    }
    const next = urlWithParams(params);
    const current = currentUrl();
    const closedBySearch = detailClosedBySearchRef.current;
    const action = resolveDetailHistory({
      detailOpen: sheetView === 'detail',
      wasOpen: wasDetail,
      urlChanged: next !== current,
      pushed: detailEntryPushedRef.current,
      closedBySearch,
    });

    if (sheetView !== 'detail') {
      detailEntryPushedRef.current = false;
      detailClosedBySearchRef.current = false;
      /* Only a real traversal can undo the trip to the list — see the popstate
         handler, which is where the scroll then happens. */
      if (action !== 'back') listAnchorPendingRef.current = false;
    } else if (action === 'push') {
      detailEntryPushedRef.current = true;
    }

    if (action === 'push') window.history.pushState(window.history.state, '', next);
    else if (action === 'replace') window.history.replaceState(window.history.state, '', next);
    else if (action === 'back') window.history.back();
  }, [isActive, sheetView, selectedRestaurant?.slug, selectedMustEat?._id]);

  /* Die offene Sheet hält ein Objekt aus der Payload, die beim Öffnen da war.
     Kommt eine neue herein — Refetch nach der Anmeldung, geänderte Sanity-Daten
     —, wird das Objekt ausgetauscht, statt bis zum Schließen und Wiederöffnen
     auf dem alten Stand zu stehen. */
  useEffect(() => {
    if (!selectedRestaurant) return;
    const fresh = restaurants.find((r) => r._id === selectedRestaurant._id);
    if (fresh && fresh !== selectedRestaurant) setSelectedRestaurant(fresh);
  }, [restaurants, selectedRestaurant]);

  // Pager: neighbours of the open restaurant within the list the user was
  // browsing when the detail opened (same order as the list view). Falls
  // back to the live list only if the snapshot doesn't hold the spot (it
  // was refetched away, or the detail opened without a click). Paging swaps
  // the selection in place — no list↔detail view switch (already in detail).
  const pagerAdjacent = useMemo(
    () =>
      selectedRestaurant
        ? resolvePagerAdjacent(pagerList, listRestaurants, selectedRestaurant._id)
        : { index: -1, prev: null, next: null },
    [pagerList, listRestaurants, selectedRestaurant]
  );

  // Warm the neighbours' detail fields while a detail pane is open, so a
  // pager swipe lands on fully-populated content instead of popping the
  // story text in after the transition.
  useEffect(() => {
    if (!selectedRestaurant) return;
    if (pagerAdjacent.prev) prefetchRestaurantDetail(pagerAdjacent.prev.slug);
    if (pagerAdjacent.next) prefetchRestaurantDetail(pagerAdjacent.next.slug);
  }, [selectedRestaurant, pagerAdjacent]);

  /* Das geöffnete Must Eat folgt der frischesten Payload. Der Deep-Link greift
     den Datensatz, den die Seite beim ersten Effekt-Durchlauf hat — und der
     führt verdeckte Karten gestrippt. Ohne diesen Abgleich blieb das Detail
     bei „Verdeckt" mit Kartenrücken, während `isUnlocked` längst offen sagte
     (siehe freshestMustEat). */
  useEffect(() => {
    if (!selectedMustEat) return;
    const fresh = freshestMustEat(mustEats, selectedMustEat);
    if (fresh !== selectedMustEat) setSelectedMustEat(fresh);
  }, [mustEats, selectedMustEat]);

  // Global must-eat pager: neighbours within the FULL must-eat list (no
  // filtering — the layer/list is gone). Paging swaps the selection in place.
  const mustEatPagerAdjacent = useMemo(
    () =>
      selectedMustEat
        ? resolveAdjacent(mustEats, selectedMustEat._id)
        : { index: -1, prev: null, next: null },
    [mustEats, selectedMustEat]
  );
  /* Zählstand für den Zoom („3 / 25") — memoisiert, weil die Lightbox ihn als
     Objekt bekommt und ihr Inneres darauf memoisiert ist. */
  const mustEatPagerPosition = useMemo(
    () =>
      mustEatPagerAdjacent.index >= 0
        ? { index: mustEatPagerAdjacent.index + 1, count: mustEats.length }
        : undefined,
    [mustEatPagerAdjacent.index, mustEats.length]
  );
  /* Stand der Sammlung für die Bühne des Aufdeckens („12 / 25") — offene
     gegen alle Karten, wie der „Alle"-Reiter im Profil zählt. */
  const mustEatCollection = useMemo(
    () => ({
      count: mustEats.reduce((n, m) => (unlockedIds.has(m._id) ? n + 1 : n), 0),
      total: mustEats.length,
    }),
    [mustEats, unlockedIds]
  );

  /* The other half of the pushed detail entry: a back gesture / back button
     lands on the list URL, and the open detail has to follow it shut. Clearing
     detailEntryPushedRef first is what stops the URL-sync effect from calling
     history.back() a second time on the state change we're reacting to.
     Going forward again re-opens the spot the URL names — useMapDeepLinks
     only fires once per session, so it can't do this for us. */
  const popStateHandlersRef = useRef({ restaurants, mustEats });
  popStateHandlersRef.current = { restaurants, mustEats };
  const openFromUrl = (slug: string | null, mustEatId: string | null) => {
    const { restaurants: rows, mustEats: mes } = popStateHandlersRef.current;
    if (mustEatId) {
      const target = mes.find((m) => m._id === mustEatId);
      if (target) openRef.current.mustEat(target);
      return;
    }
    if (!slug) return;
    const target = rows.find((r) => r.slug === slug);
    if (target) openRef.current.restaurant(target);
  };
  const openFromUrlRef = useRef(openFromUrl);
  openFromUrlRef.current = openFromUrl;

  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('r');
      const mustEatId = params.get('me');
      const detailOpen = sheetViewRef.current === 'detail';
      if (!slug && !mustEatId) {
        if (!detailOpen) {
          /* Tail end of a close we already ran: the list is on screen and this
             is the detail entry being popped behind it. ScrollRestorer
             (app/components/ScrollRestorer.tsx) restores the popped-to entry's
             saved position inside this same dispatch — the map stop, for a spot
             opened from a marker. rAF puts the trip to the list after it. */
          if (listAnchorPendingRef.current) {
            listAnchorPendingRef.current = false;
            requestAnimationFrame(() => scrollListToAnchor('mid'));
          }
          return;
        }
        detailEntryPushedRef.current = false;
        dismissDetailRef.current();
        return;
      }
      if (detailOpen) return;
      openFromUrlRef.current(slug, mustEatId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isActive, scrollListToAnchor, dismissDetailRef]);

  return {
    selectedRestaurant,
    setSelectedRestaurant,
    selectedMustEat,
    setSelectedMustEat,
    freezePager,
    pagerAdjacent,
    mustEatPagerAdjacent,
    mustEatPagerPosition,
    mustEatCollection,
    detailEntryPushedRef,
    detailClosedBySearchRef,
    listAnchorPendingRef,
  };
}
