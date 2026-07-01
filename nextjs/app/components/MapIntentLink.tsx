'use client'

import type { ComponentProps, FocusEvent, MouseEvent, TouchEvent } from 'react'
import { useCallback } from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { preloadMapSurface } from './map/preloadMapSurface'

type Props = ComponentProps<typeof Link>

function hrefToString(href: Props['href']): string | null {
  if (typeof href === 'string') return href
  if (href && typeof href === 'object' && 'pathname' in href && typeof href.pathname === 'string') {
    const query = 'query' in href && href.query ? href.query : null
    if (!query || typeof query !== 'object') return href.pathname
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value == null) continue
      if (Array.isArray(value)) {
        for (const item of value) params.append(key, String(item))
      } else {
        params.set(key, String(value))
      }
    }
    const qs = params.toString()
    return qs ? `${href.pathname}?${qs}` : href.pathname
  }
  return null
}

export default function MapIntentLink({
  href,
  onMouseEnter,
  onFocus,
  onTouchStart,
  onClick,
  children,
  ...props
}: Props) {
  const router = useRouter()
  const preload = useCallback(() => {
    void preloadMapSurface()
    const target = hrefToString(href)
    if (target) {
      ;(router.prefetch as (href: string) => void)(target)
    }
  }, [href, router])

  return (
    <Link
      {...props}
      href={href}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        preload()
        onMouseEnter?.(event)
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        preload()
        onFocus?.(event)
      }}
      onTouchStart={(event: TouchEvent<HTMLAnchorElement>) => {
        preload()
        onTouchStart?.(event)
      }}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        preload()
        onClick?.(event)
      }}
    >
      {children}
    </Link>
  )
}
