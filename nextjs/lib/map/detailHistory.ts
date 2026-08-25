/** What the map should do with the browser history when the open detail changes. */
export type DetailHistoryAction = 'none' | 'push' | 'replace' | 'back';

interface DetailHistoryState {
  /** A detail is open in this render. */
  detailOpen: boolean;
  /** A detail was open in the previous one — a swap, not an opening. */
  wasOpen: boolean;
  /** The URL the map wants differs from the one in the bar. */
  urlChanged: boolean;
  /** The entry on top of the stack is one WE pushed, so ours to unwind. */
  pushed: boolean;
  /** A search query closed the detail — see MapSection. */
  closedBySearch: boolean;
}

/**
 * The map keeps the open detail in the URL (?r=<slug> / ?me=<id>) so a reload
 * reopens it and an open spot is shareable. Which history operation that takes
 * is not obvious, and getting it wrong is what sent people out of the map:
 *
 * - Opening a detail FROM THE LIST pushes, so the phone's back gesture closes
 *   the detail instead of leaving the map.
 * - Every change while a detail is ALREADY open replaces — pager swipes, marker
 *   taps, and a must-eat handing over to its restaurant. This used to key on
 *   "did we push?" instead of "was one open?", and the difference is exactly
 *   the deep-linked case: arriving on ?me=… and closing to the restaurant
 *   pushed a second entry, so the X on that restaurant popped back into the
 *   must-eat it had just left. The X is not a back button: it goes to the list.
 * - Closing unwinds only what we pushed ourselves. A deep-linked or reloaded
 *   URL is somebody else's entry and is only ever replaced — going back there
 *   leaves the map entirely.
 */
export function resolveDetailHistory({
  detailOpen,
  wasOpen,
  urlChanged,
  pushed,
  closedBySearch,
}: DetailHistoryState): DetailHistoryAction {
  if (detailOpen) {
    if (!urlChanged) return 'none';
    return pushed || wasOpen ? 'replace' : 'push';
  }
  /* Closing. The pushed entry is popped rather than replaced — otherwise the
     forward stack keeps a detail the user just dismissed, and one back press
     would re-open it. The one exception is a close caused by typing in the
     search box: popping re-applies the OLD filter state, which would wipe the
     query in the same moment it brought the list back. */
  if (pushed) return closedBySearch ? 'replace' : 'back';
  return urlChanged ? 'replace' : 'none';
}
