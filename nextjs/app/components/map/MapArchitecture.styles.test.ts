import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

const moduleNames = [
  'MapLayout.module.css',
  'MapSheet.module.css',
  'MapControls.module.css',
  'MapMarkers.module.css',
  'MapDetails.module.css',
  'MapFilters.module.css',
  'MapListEmpty.module.css',
  'RestaurantList.module.css',
  'RestaurantGalleryLightbox.module.css',
  'MustEatImageLightbox.module.css',
  'MustEatRevealOverlay.module.css',
] as const

function modulePath(name: string) {
  return fileURLToPath(new URL(`./${name}`, import.meta.url))
}

function localClasses(name: string) {
  const root = postcss.parse(readFileSync(modulePath(name), 'utf8'))
  const classes = new Set<string>()
  root.walkRules((rule) => {
    const localSelector = rule.selector.replaceAll(/:global\([^)]*\)/g, '')
    for (const match of localSelector.matchAll(/\.([A-Za-z_][\w-]*)/g)) {
      if (!match[1].startsWith('maplibregl-')) classes.add(match[1])
    }
  })
  return [...classes].sort()
}

describe('Map CSS architecture', () => {
  it('keeps every map module free of !important', () => {
    const important: string[] = []

    for (const name of moduleNames) {
      const root = postcss.parse(readFileSync(modulePath(name), 'utf8'))
      root.walkDecls((declaration) => {
        if (declaration.important) important.push(`${name}: ${declaration.prop}`)
      })
    }

    expect(important).toEqual([])
  })

  it('keeps the former monolith split by responsibility', () => {
    expect(existsSync(modulePath('map.module.css'))).toBe(false)
    expect(localClasses('MapLayout.module.css')).toEqual([
      'body',
      'liveMapLayer',
      'mapLoading',
      'mapWrap',
      'shell',
      'srOnly',
    ])
    expect(localClasses('MapSheet.module.css')).toEqual([
      'handle',
      'list',
      'listScroll',
      'stuckSentinel',
    ])
    expect(localClasses('MapMarkers.module.css')).toEqual([
      'markerRoot',
      'pinLogo',
      'pinLogoActive',
      'pinLogoHasMust',
      'pinLogoShape',
      'staticDetailAttribution',
      'staticDetailMapPeek',
      'staticDetailMapTile',
      'staticDetailPin',
      'staticDetailPinActive',
      'staticDetailPinHasMust',
      'userLoc',
      'userLocAvatar',
    ])
  })

  it('uses stable data contracts between layout, sheet and controls', () => {
    const controls = readFileSync(modulePath('MapControls.module.css'), 'utf8')
    const sheet = readFileSync(modulePath('MapSheet.module.css'), 'utf8')

    expect(controls).toContain(':global([data-map-body]')
    expect(sheet).toContain(':global([data-map-body]')
    expect(controls).not.toMatch(/\.body(?:\[|\s|:)/)
    expect(sheet).not.toMatch(/\.(?:body|shell)(?:\[|\s|:)/)
  })

  it('contains only the MapLibre controls that are actually mounted', () => {
    const layout = readFileSync(modulePath('MapLayout.module.css'), 'utf8')
    const controls = readFileSync(modulePath('MapControls.module.css'), 'utf8')

    expect(layout).toContain('maplibregl-canvas')
    expect(layout).toContain('maplibregl-ctrl-attrib')
    expect(layout).toContain('maplibregl-ctrl-bottom-left')
    expect(`${layout}\n${controls}`).not.toMatch(
      /maplibregl-(?:ctrl-group|ctrl-top-left|ctrl-top-right|ctrl-bottom-right)/
    )
    expect(controls).not.toContain('.mapBurger img')
  })
})
