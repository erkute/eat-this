'use client'
import type { MapRestaurant } from '@/lib/types'
import { getOpenStatus } from '@/lib/map/openingHours'
import { haversineDistance, formatDistance } from '@/lib/map/distance'
import LocaleLink from '@/app/components/LocaleLink'
import type { UserLocation } from '@/lib/map/useUserLocation'

interface RestaurantDetailProps {
  restaurant: MapRestaurant
  userLocation: UserLocation | null
  onClose: () => void
}

export default function RestaurantDetail({ restaurant, userLocation, onClose }: RestaurantDetailProps) {
  const status = restaurant.openingHours
    ? getOpenStatus(restaurant.openingHours)
    : { isOpen: false, label: '', minutesUntilChange: null }

  const distance = userLocation
    ? formatDistance(haversineDistance(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng))
    : null

  return (
    <div style={{
      position:     'absolute',
      bottom:       0,
      left:         0,
      right:        0,
      background:   'var(--bg, #fff)',
      borderRadius: '16px 16px 0 0',
      boxShadow:    '0 -4px 24px rgba(0,0,0,0.15)',
      zIndex:       10,
      maxHeight:    '60vh',
      overflowY:    'auto',
    }}>
      <div style={{ width: 36, height: 4, background: 'var(--border, #ddd)', borderRadius: 2, margin: '12px auto 0' }} />

      <button
        onClick={onClose}
        aria-label="Close"
        style={{ position: 'absolute', top: 12, right: 12, background: 'var(--surface, #f5f5f5)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 16 }}
      >
        ×
      </button>

      {restaurant.photo && (
        <img src={restaurant.photo} alt={restaurant.name} style={{ width: '100%', height: 140, objectFit: 'cover', marginTop: 8 }} />
      )}

      <div style={{ padding: '12px 16px 24px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
          {restaurant.name}
        </h3>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          {restaurant.district   && <span>{restaurant.district}</span>}
          {restaurant.price      && <span>{restaurant.price}</span>}
          {distance              && <span>{distance}</span>}
          {restaurant.categories?.map(c => <span key={c}>{c}</span>)}
        </div>

        {status.label && (
          <div style={{ fontSize: 13, color: status.isOpen ? '#4caf50' : '#e85d2f', marginBottom: 8, fontWeight: 500 }}>
            {status.label}
          </div>
        )}

        {restaurant.tip && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
            💡 {restaurant.tip}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {restaurant.mapsUrl && (
            <a href={restaurant.mapsUrl} target="_blank" rel="noopener noreferrer"
              style={{ padding: '8px 14px', background: '#e85d2f', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Open in Maps
            </a>
          )}
          {restaurant.reservationUrl && (
            <a href={restaurant.reservationUrl} target="_blank" rel="noopener noreferrer"
              style={{ padding: '8px 14px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>
              Reserve
            </a>
          )}
          <LocaleLink href={`/restaurant/${restaurant.slug}`}
            style={{ padding: '8px 14px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>
            Details
          </LocaleLink>
        </div>
      </div>
    </div>
  )
}
