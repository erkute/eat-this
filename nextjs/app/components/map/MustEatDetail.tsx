'use client'
import type { MapMustEat } from '@/lib/types'
import { haversineDistance, formatDistance } from '@/lib/map/distance'
import type { UserLocation } from '@/lib/map/useUserLocation'

const UNLOCK_RADIUS_METERS = 200

interface MustEatDetailProps {
  mustEat: MapMustEat
  userLocation: UserLocation | null
  isUnlocked: boolean
  onUnlock: () => void
  onClose: () => void
}

export default function MustEatDetail({ mustEat, userLocation, isUnlocked, onUnlock, onClose }: MustEatDetailProps) {
  const distance = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, mustEat.restaurant.lat, mustEat.restaurant.lng)
    : null

  const canUnlock = distance !== null && distance <= UNLOCK_RADIUS_METERS

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
      maxHeight:    '65vh',
      overflowY:    'auto',
    }}>
      <div style={{ width: 36, height: 4, background: 'var(--border, #ddd)', borderRadius: 2, margin: '12px auto 0' }} />
      <button onClick={onClose} aria-label="Close"
        style={{ position: 'absolute', top: 12, right: 12, background: 'var(--surface, #f5f5f5)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 16 }}>
        ×
      </button>

      <div style={{ padding: '12px 16px 32px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#e85d2f', marginBottom: 4 }}>
          Must-Eat
        </div>

        {isUnlocked ? (
          <>
            <img src={mustEat.image} alt={mustEat.dish}
              style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{mustEat.dish}</h3>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              {mustEat.restaurant.name} · {mustEat.restaurant.district}
            </div>
            {mustEat.description && (
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{mustEat.description}</p>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width:          80,
              height:         112,
              margin:         '0 auto 16px',
              borderRadius:   10,
              background:     'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              boxShadow:      '0 4px 16px rgba(0,0,0,0.2)',
              border:         '2px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{ fontSize: 36 }}>?</span>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>
              {mustEat.restaurant.name}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
              {canUnlock
                ? "You're here! Tap to reveal this Must-Eat."
                : distance !== null
                  ? `${formatDistance(distance)} away — get closer to unlock`
                  : 'Enable location to unlock Must-Eats on-site'}
            </p>
            {canUnlock && (
              <button onClick={onUnlock} style={{
                padding:    '10px 24px',
                background: '#e85d2f',
                color:      '#fff',
                border:     'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize:   15,
                cursor:     'pointer',
              }}>
                Reveal Must-Eat 🎴
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
