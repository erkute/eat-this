/**
 * The list follows the map.
 *
 * Until the user touches the map, the list is a curated ranking (listOrder)
 * or, with a position fix, the spots around the visitor. From the first drag,
 * pinch or marker tap on, it is the spots around the CENTRE OF THE MAP — the
 * same claim a map app makes: what you see up there is what stands down here
 * (user decision 04.09.2026). Before that, the tapped marker's neighbourhood
 * came back as a list that started in Mitte, whatever the map showed.
 *
 * `moveend` fires for every camera change, so this decides which of them may
 * re-anchor the list:
 *
 * - A user gesture (drag, pinch, wheel — MapLibre hands the DOM event along as
 *   `originalEvent`) always does, and switches following on for good.
 * - A programmatic flight only once following is on, and only while the list
 *   is what the sheet shows. The flight INTO a detail is not the user's view
 *   — the camera hands it back on close, and that return is the move that
 *   counts. Before following is on, the auto-locate flight and the filter
 *   fits leave the curated order alone.
 */
export interface ListCenter {
  lat: number;
  lng: number;
}

export interface MoveEndContext {
  /** MapLibre attached a DOM event: the user moved the map. */
  userGesture: boolean;
  /** The list already follows the map. */
  following: boolean;
  /** A restaurant or must-eat detail is what the sheet shows. */
  detailOpen: boolean;
}

export function listFollowsMove({ userGesture, following, detailOpen }: MoveEndContext): boolean {
  if (userGesture) return true;
  return following && !detailOpen;
}

/** Two centres a hair apart are the same centre — MapLibre reports the last
 *  flight frame with float noise, and a re-sort costs a list render. */
export function sameCenter(a: ListCenter | null, b: ListCenter): boolean {
  if (!a) return false;
  return Math.abs(a.lat - b.lat) < 1e-5 && Math.abs(a.lng - b.lng) < 1e-5;
}
