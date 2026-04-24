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
  onMapClick?: () => void
  children?: React.ReactNode
}

const MapCanvas = forwardRef<MapRef, MapCanvasProps>(({ onMove, onMapClick, children }, ref) => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const el = document.documentElement
    const update = () => setIsDark(el.getAttribute('data-theme') === 'dark')
    update()
    const mo = new MutationObserver(update)
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
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
      onClick={() => onMapClick?.()}
    >
      <NavigationControl position="bottom-right" showCompass={false} />
      {children}
    </Map>
  )
})

MapCanvas.displayName = 'MapCanvas'
export default MapCanvas
