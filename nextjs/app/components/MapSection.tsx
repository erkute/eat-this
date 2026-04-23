'use client'
import { useRef, useState, useMemo, useCallback } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { MapRestaurant, MapMustEat, MapLayer, MapCategory } from '@/lib/types'
import { useMapData } from '@/lib/map/useMapData'
import { useUserLocation } from '@/lib/map/useUserLocation'
import { useBounds } from '@/lib/map/useBounds'
import { useUnlockedMustEats } from '@/lib/map/useUnlockedMustEats'
import MapCanvas from './map/MapCanvas'
import RestaurantMarker from './map/RestaurantMarker'
import MustEatMarker from './map/MustEatMarker'
import RestaurantList from './map/RestaurantList'
import RestaurantDetail from './map/RestaurantDetail'
import MustEatDetail from './map/MustEatDetail'
import CategoryFilter from './map/CategoryFilter'
import LayerToggle from './map/LayerToggle'
import { auth } from '@/lib/firebase/config'

interface Props {
  isActive?: boolean
}

export default function MapSection({ isActive = false }: Props) {
  const mapRef = useRef<MapRef>(null)

  const { restaurants, mustEats, loading } = useMapData()
  const { location, request: requestLocation } = useUserLocation()
  const { updateBounds, visibleRestaurants } = useBounds(restaurants, location)
  const uid = auth.currentUser?.uid ?? null
  const { unlockedIds, unlock } = useUnlockedMustEats(uid)

  const [layer,              setLayer]              = useState<MapLayer>('restaurants')
  const [category,           setCategory]           = useState<MapCategory>('All')
  const [search,             setSearch]             = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState<MapRestaurant | null>(null)
  const [selectedMustEat,    setSelectedMustEat]    = useState<MapMustEat | null>(null)

  const filteredRestaurants = useMemo(() => {
    let list = visibleRestaurants
    if (category !== 'All') {
      list = list.filter(r => r.categories?.includes(category))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        r =>
          r.name.toLowerCase().includes(q) ||
          r.district?.toLowerCase().includes(q) ||
          r.categories?.some(c => c.toLowerCase().includes(q))
      )
    }
    return list
  }, [visibleRestaurants, category, search])

  const handleRestaurantClick = useCallback((r: MapRestaurant) => {
    setSelectedRestaurant(r)
    setSelectedMustEat(null)
    mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 15, duration: 500 })
  }, [])

  const handleMustEatClick = useCallback((m: MapMustEat) => {
    setSelectedMustEat(m)
    setSelectedRestaurant(null)
    mapRef.current?.flyTo({ center: [m.restaurant.lng, m.restaurant.lat], zoom: 15, duration: 500 })
  }, [])

  const handleUnlock = useCallback(async () => {
    if (!selectedMustEat) return
    await unlock(selectedMustEat._id, selectedMustEat.restaurant._id, selectedMustEat.dish)
  }, [selectedMustEat, unlock])

  return (
    <div
      className={`app-page${isActive ? ' active' : ''}`}
      data-page="map"
      suppressHydrationWarning
    >
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
          Loading map…
        </div>
      ) : (
        <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>

          <div style={{ padding: '8px 12px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Restaurant, district, pizza…"
              style={{
                width:        '100%',
                padding:      '8px 12px',
                borderRadius: 20,
                border:       '1px solid var(--border)',
                background:   'var(--surface)',
                fontSize:     14,
                outline:      'none',
                boxSizing:    'border-box',
              }}
            />
          </div>

          <div style={{ position: 'relative', flex: '0 0 50%' }}>
            <MapCanvas ref={mapRef} onMove={updateBounds}>

              <LayerToggle
                active={layer}
                onChange={setLayer}
                unlockedCount={unlockedIds.size}
                totalMustEats={mustEats.length}
              />

              {layer === 'restaurants' && restaurants.map(r => (
                <RestaurantMarker
                  key={r._id}
                  restaurant={r}
                  isSelected={selectedRestaurant?._id === r._id}
                  onClick={handleRestaurantClick}
                />
              ))}

              {layer === 'mustEats' && mustEats.map(m => (
                <MustEatMarker
                  key={m._id}
                  mustEat={m}
                  isUnlocked={unlockedIds.has(m._id)}
                  isSelected={selectedMustEat?._id === m._id}
                  onClick={handleMustEatClick}
                />
              ))}
            </MapCanvas>

            <button
              onClick={requestLocation}
              aria-label="My location"
              style={{
                position:      'absolute',
                bottom:        12,
                right:         12,
                zIndex:        5,
                width:         36,
                height:        36,
                borderRadius:  '50%',
                background:    'var(--bg, #fff)',
                border:        'none',
                boxShadow:     '0 2px 8px rgba(0,0,0,0.15)',
                cursor:        'pointer',
                display:       'flex',
                alignItems:    'center',
                justifyContent: 'center',
                fontSize:      18,
              }}
            >
              📍
            </button>

            {selectedRestaurant && (
              <RestaurantDetail
                restaurant={selectedRestaurant}
                userLocation={location}
                onClose={() => setSelectedRestaurant(null)}
              />
            )}
            {selectedMustEat && (
              <MustEatDetail
                mustEat={selectedMustEat}
                userLocation={location}
                isUnlocked={unlockedIds.has(selectedMustEat._id)}
                onUnlock={handleUnlock}
                onClose={() => setSelectedMustEat(null)}
              />
            )}
          </div>

          {layer === 'restaurants' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
              <CategoryFilter active={category} onChange={setCategory} />
              <RestaurantList
                restaurants={filteredRestaurants}
                userLocation={location}
                selectedId={selectedRestaurant?._id ?? null}
                onSelect={handleRestaurantClick}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
