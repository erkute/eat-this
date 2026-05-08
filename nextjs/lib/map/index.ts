// Barrel for lib/map — one-stop import for the map feature.
// Each line is grouped by what it owns; prefer this over deep paths in new code.

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
export { useUnlockedMustEats } from './useUnlockedMustEats'

// List/filter logic
export { useMapFilters } from './useMapFilters'
export type { SortMode } from './useMapFilters'

// Bottom-sheet state machine
export { useBottomSheet } from './useBottomSheet'
export type { SheetSnap } from './useBottomSheet'
export { useMapSheet } from './useMapSheet'
export type { SheetView } from './useMapSheet'
export { useMapSheetSwipeClose } from './useMapSheetSwipeClose'

// URL <-> sheet wiring
export { useMapDeepLinks } from './useMapDeepLinks'
