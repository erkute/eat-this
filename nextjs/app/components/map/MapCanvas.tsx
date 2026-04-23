'use client'
import { forwardRef, useEffect, useState } from 'react'
import Map, { NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const DARK_STYLE  = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

const BERLIN = { longitude: 13.405, latitude: 52.52, zoom: 12 }

interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

interface MapCanvasProps {
  onMove?: (bounds: MapBounds) => void
  children?: React.ReactNode
}

const MapCanvas = forwardRef<MapRef, MapCanvasProps>(({ onMove, children }, ref) => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <Map
      ref={ref}
      initialViewState={BERLIN}
      style={{ width: '100%', height: '100%' }}
      mapStyle={isDark ? DARK_STYLE : LIGHT_STYLE}
      onMove={e => {
        if (!onMove) return
        const b = e.target.getBounds()
        onMove({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() })
      }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {children}
    </Map>
  )
})

MapCanvas.displayName = 'MapCanvas'
export default MapCanvas
