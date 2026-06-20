'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const DEFAULT_THEME_COLOR = '#e8b626'
const MAP_THEME_COLOR = '#171A17'

function stripLocale(path: string): string {
  if (path === '/en' || path.startsWith('/en/')) return path.slice(3) || '/'
  return path
}

function activePageFromPath(path: string): string {
  const p = stripLocale(path)
  if (p === '/') return 'start'
  if (p.startsWith('/news/') && p.length > 6) return 'news-article'
  return p.replace(/^\//, '').split('/')[0]
}

function themeColorMeta(): HTMLMetaElement {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (existing) return existing

  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = DEFAULT_THEME_COLOR
  document.head.appendChild(meta)
  return meta
}

export default function MapBrowserChrome() {
  const pathname = usePathname()
  const isMap = activePageFromPath(pathname) === 'map'

  useEffect(() => {
    const root = document.documentElement
    const meta = themeColorMeta()
    const previousThemeColor = meta.getAttribute('content') || DEFAULT_THEME_COLOR
    const previousColorScheme = root.style.colorScheme

    if (isMap) {
      meta.setAttribute('content', MAP_THEME_COLOR)
      // iOS Safari uses the page color scheme when rendering the translucent
      // bottom URL bar. Keep the app visually light, but make the browser
      // chrome use its dark material so no white fade washes over map cards.
      root.style.colorScheme = 'dark'
    } else {
      meta.setAttribute('content', DEFAULT_THEME_COLOR)
      root.style.colorScheme = ''
    }

    return () => {
      meta.setAttribute('content', previousThemeColor)
      root.style.colorScheme = previousColorScheme
    }
  }, [isMap])

  return null
}
