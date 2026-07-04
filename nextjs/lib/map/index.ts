// Barrel for lib/map — one-stop import for the map feature.
// Each line is grouped by what it owns; prefer this over deep paths in new code.
//
// NOTE: This barrel re-exports client-only hooks (useEffect/useState/useRef).
// Server code (route.ts, page.tsx without 'use client') must import the
// individual deep modules instead — e.g. './queries' for GROQ strings —
// otherwise Next.js pulls the client hooks into the server bundle and fails
// with "Hook only works in a Client Component".

// Pure helpers
export { buildPeekMustEatMap, resolvePeek } from './mustEatPeek'
export type { Peek } from './mustEatPeek'
export { resolveUnlockedMustEatIds } from './unlockedMustEats'
export { haversineDistance, formatDistance, formatWalkingTime } from './distance'
export { getOpenStatus } from './openingHours'
export { abbreviateBezirk } from './abbreviateBezirk'

// Data sources
export { useMapData } from './useMapData'
export { useUserLocation } from './useUserLocation'
export type { UserLocation } from './useUserLocation'
export { useFavorites } from './useFavorites'
export { useUnlockedMustEats } from './useUnlockedMustEats'

// List/filter logic
export { useMapFilters } from './useMapFilters'

// Bottom-sheet state machine
export type { SheetSnap } from './useBottomSheet'
export { useMapSheet } from './useMapSheet'
export type { SheetView } from './useMapSheet'

// URL <-> sheet wiring
export { useMapDeepLinks } from './useMapDeepLinks'

// Entitlement tier (drives anon/starter/all-Berlin promotion surfaces)
export { useUserTier } from './useUserTier'
export type { UserTier } from './useUserTier'
