'use client'
import { useEffect, useMemo, useState } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import type { UserLocation } from '@/lib/map/useUserLocation'
import styles from './map.module.css'

interface UserLocationMarkerProps {
  location: UserLocation
}

/**
 * Remove a flat background color from an image on a client-side canvas.
 * Samples corner pixels to detect the bg color, then keys out pixels
 * within `tolerance` distance in RGB space.
 */
function chromaKey(img: HTMLImageElement, tolerance = 48): string {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d')
  if (!ctx) return img.src
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, c.width, c.height)
  const d = data.data

  // Average the 4 corner pixels as the target background color
  const corners = [
    [0, 0],
    [c.width - 1, 0],
    [0, c.height - 1],
    [c.width - 1, c.height - 1],
  ]
  let tr = 0, tg = 0, tb = 0
  for (const [x, y] of corners) {
    const i = (y * c.width + x) * 4
    tr += d[i]
    tg += d[i + 1]
    tb += d[i + 2]
  }
  tr /= 4; tg /= 4; tb /= 4

  const tol2 = tolerance * tolerance
  for (let i = 0; i < d.length; i += 4) {
    const dr = d[i]     - tr
    const dg = d[i + 1] - tg
    const db = d[i + 2] - tb
    if (dr * dr + dg * dg + db * db < tol2) {
      d[i + 3] = 0
    }
  }
  ctx.putImageData(data, 0, 0)
  return c.toDataURL('image/png')
}

const AVATAR_CACHE = new Map<number, string>()

export default function UserLocationMarker({ location }: UserLocationMarkerProps) {
  // Fresh pick on every mount so each page load gets a different character.
  const avatarIndex = useMemo(() => Math.floor(Math.random() * 3) + 1, [])

  const [src, setSrc] = useState<string>(() => AVATAR_CACHE.get(avatarIndex) ?? `/pics/avatar/${avatarIndex}.jpeg`)

  useEffect(() => {
    if (AVATAR_CACHE.has(avatarIndex)) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const dataUrl = chromaKey(img, 60)
        AVATAR_CACHE.set(avatarIndex, dataUrl)
        setSrc(dataUrl)
      } catch {
        /* canvas may taint if CORS fails; fall back to original */
      }
    }
    img.src = `/pics/avatar/${avatarIndex}.jpeg`
  }, [avatarIndex])

  return (
    <Marker longitude={location.lng} latitude={location.lat} anchor="center">
      <div className={styles.userLoc} aria-label="Your location">
        <img
          src={src}
          alt=""
          className={styles.userLocAvatar}
          draggable={false}
        />
      </div>
    </Marker>
  )
}
