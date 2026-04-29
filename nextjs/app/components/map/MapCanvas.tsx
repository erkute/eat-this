'use client'
import { forwardRef, useEffect, useState } from 'react'
import Map, { NavigationControl, AttributionControl, type MapRef } from 'react-map-gl/maplibre'
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

  // MapLibre opens the compact attribution by default on mount. Collapse it
  // so only the small ⓘ button stays visible until the user taps it. Then
  // observe attribute changes for ~3 s after we find the element, undoing
  // any maplibre-internal re-open before user interaction.
  useEffect(() => {
    let observer: MutationObserver | null = null
    let observerStart = 0
    const collapseEl = (el: HTMLDetailsElement) => {
      el.open = false
      el.classList.remove('maplibregl-compact-show')
    }
    const findAndAttach = () => {
      const el = document.querySelector(
        'details.maplibregl-ctrl-attrib.maplibregl-compact'
      ) as HTMLDetailsElement | null
      if (!el) return false
      collapseEl(el)
      observerStart = Date.now()
      observer = new MutationObserver(() => {
        if (Date.now() - observerStart > 3000) { observer?.disconnect(); return }
        if (el.open) collapseEl(el)
      })
      observer.observe(el, { attributes: true, attributeFilter: ['open', 'class'] })
      return true
    }
    let tries = 0
    const id = window.setInterval(() => {
      tries += 1
      if (findAndAttach() || tries > 30) window.clearInterval(id)
    }, 50)
    return () => {
      window.clearInterval(id)
      observer?.disconnect()
    }
  }, [])

  return (
    <Map
      ref={ref}
      initialViewState={BERLIN}
      style={{ width: '100%', height: '100%' }}
      mapStyle={isDark ? DARK_STYLE : LIGHT_STYLE}
      attributionControl={false}
      onMove={e => {
        if (!onMove) return
        const b = e.target.getBounds()
        onMove({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() })
      }}
      onClick={() => onMapClick?.()}
    >
      <AttributionControl position="top-left" compact />
      <NavigationControl position="bottom-right" showCompass={false} />
      {children}
    </Map>
  )
})

MapCanvas.displayName = 'MapCanvas'
export default MapCanvas
