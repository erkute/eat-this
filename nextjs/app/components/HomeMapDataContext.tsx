'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { useMapData } from '@/lib/map'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'

interface HomeMapDataValue {
  initialMapData: InitialMapData
  live: ReturnType<typeof useMapData>
  uid: string | null
}

const HomeMapDataContext = createContext<HomeMapDataValue | null>(null)

export function HomeMapDataProvider({
  initialMapData,
  children,
}: {
  initialMapData: InitialMapData
  children: ReactNode
}) {
  const { user, loading: authLoading } = useAuth()
  const uid = user?.uid ?? null
  const live = useMapData({ uid, authLoading, initialMapData })

  return (
    <HomeMapDataContext.Provider value={{ initialMapData, live, uid }}>
      {children}
    </HomeMapDataContext.Provider>
  )
}

export function useHomeMapData(): HomeMapDataValue {
  const value = useContext(HomeMapDataContext)
  if (!value) {
    throw new Error('useHomeMapData must be used within HomeMapDataProvider')
  }
  return value
}
