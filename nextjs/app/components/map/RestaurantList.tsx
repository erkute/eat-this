'use client'
import type { MapRestaurant, OpenStatus } from '@/lib/types'
import { haversineDistance, formatDistance } from '@/lib/map/distance'
import { getOpenStatus } from '@/lib/map/openingHours'
import type { UserLocation } from '@/lib/map/useUserLocation'

interface ItemProps {
  restaurant: MapRestaurant
  userLocation: UserLocation | null
  isSelected: boolean
  onClick: (r: MapRestaurant) => void
}

function Item({ restaurant, userLocation, isSelected, onClick }: ItemProps) {
  const status: OpenStatus = restaurant.openingHours
    ? getOpenStatus(restaurant.openingHours)
    : { isOpen: false, label: '', minutesUntilChange: null }

  const distance = userLocation
    ? formatDistance(haversineDistance(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng))
    : null

  return (
    <button
      onClick={() => onClick(restaurant)}
      style={{
        display:       'flex',
        gap:           10,
        padding:       '10px 12px',
        background:    isSelected ? 'rgba(232,93,47,0.08)' : 'transparent',
        border:        'none',
        borderBottom:  '1px solid var(--border, #eee)',
        cursor:        'pointer',
        textAlign:     'left',
        width:         '100%',
        alignItems:    'center',
      }}
    >
      {restaurant.photo && (
        <img
          src={restaurant.photo}
          alt={restaurant.name}
          style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: 'var(--text)' }}>
          {restaurant.name}
          {restaurant.mustEatCount > 0 && (
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: '#e85d2f', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>
              Must-Eat
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {restaurant.district && <span>{restaurant.district}</span>}
          {restaurant.price    && <span>{restaurant.price}</span>}
          {distance            && <span>{distance}</span>}
        </div>
        {status.label && (
          <div style={{ fontSize: 11, marginTop: 2, color: status.isOpen ? '#4caf50' : '#999' }}>
            {status.label}
          </div>
        )}
      </div>
    </button>
  )
}

interface RestaurantListProps {
  restaurants: MapRestaurant[]
  userLocation: UserLocation | null
  selectedId: string | null
  onSelect: (r: MapRestaurant) => void
}

export default function RestaurantList({ restaurants, userLocation, selectedId, onSelect }: RestaurantListProps) {
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {restaurants.length === 0 && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          No restaurants in this area
        </div>
      )}
      {restaurants.map(r => (
        <Item
          key={r._id}
          restaurant={r}
          userLocation={userLocation}
          isSelected={selectedId === r._id}
          onClick={onSelect}
        />
      ))}
    </div>
  )
}
