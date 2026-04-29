'use client'
import { Marker } from 'react-map-gl/maplibre'
import styles from './map.module.css'

interface ClusterMarkerProps {
  lat: number
  lng: number
  count: number
  onClick: () => void
}

/**
 * Cluster bubble — shows the count of restaurants collapsed into this
 * point. Tap zooms into the cluster's expansion zoom (defined by
 * supercluster) so individual markers re-appear.
 */
export default function ClusterMarker({ lat, lng, count, onClick }: ClusterMarkerProps) {
  // Slightly bigger pill for bigger clusters so they feel proportional to
  // the volume of data they hide.
  const size = count >= 25 ? 48 : count >= 10 ? 40 : 34
  return (
    <Marker longitude={lng} latitude={lat} anchor="center" onClick={e => {
      e.originalEvent.stopPropagation()
      onClick()
    }}>
      <div
        role="button"
        aria-label={`${count} restaurants — tap to zoom in`}
        className={styles.cluster}
        style={{ width: `${size}px`, height: `${size}px`, fontSize: `${count >= 100 ? 13 : 14}px` }}
      >
        {count}
      </div>
    </Marker>
  )
}
