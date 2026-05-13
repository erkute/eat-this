// Barrel for lib/map — one-stop import for the map feature.
// Each line is grouped by what it owns; prefer this over deep paths in new code.
//
// NOTE: This barrel re-exports client-only hooks (useEffect/useState/useRef).
// Server code (route.ts, page.tsx without 'use client') must import the
// individual deep modules instead — e.g. './queries' for GROQ strings —
// otherwise Next.js pulls the client hooks into the server bundle and fails
// with "Hook only works in a Client Component".

// Pure helpers
export { haversineDistance, formatDistance, formatWalkingTime } from './distance'
export { applyFanOffset } from './fanOffset'
export type { MustEatWithDisplay } from './fanOffset'
export { getOpenStatus } from './openingHours'
export type { OpenStatusLabels } from './openingHours'

// GROQ queries (server-side)
export { mapRestaurantsQuery, mapMustEatsQuery } from './queries'

// Data sources
export { useMapData } from './useMapData'
export { useUserLocation } from './useUserLocation'
export type { UserLocation } from './useUserLocation'
export { useBounds } from './useBounds'
export { useFavorites } from './useFavorites'
export type { FavoriteEntry } from './useFavorites'
export { useInitialFit } from './useInitialFit'
export { useUnlockedMustEats } from './useUnlockedMustEats'

// List/filter logic
export { useMapFilters } from './useMapFilters'
export type { SortMode, SortDir } from './useMapFilters'

// Bottom-sheet state machine
export { useBottomSheet } from './useBottomSheet'
export type { SheetSnap } from './useBottomSheet'
export { useMapSheet } from './useMapSheet'
export type { SheetView } from './useMapSheet'

// URL <-> sheet wiring
export { useMapDeepLinks } from './useMapDeepLinks'
