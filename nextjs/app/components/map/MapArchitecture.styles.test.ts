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

function declarationsInMedia(name: string, selector: string, mediaParams: string) {
  const root = postcss.parse(readFileSync(modulePath(name), 'utf8'))
  const matches: Record<string, string>[] = []

  root.walkRules((rule) => {
    if (rule.selector !== selector) return
    const parent = rule.parent
    if (
      parent?.type !== 'atrule' ||
      parent.name !== 'media' ||
      parent.params !== mediaParams
    ) {
      return
    }

    const declarations: Record<string, string> = {}
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value
    })
    matches.push(declarations)
  })

  return matches
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

  it('keeps the phone Must Eat takeover in flow for Safari browser chrome', () => {
    const mustEatRules = declarationsInMedia(
      'MapSheet.module.css',
      ".list[data-view='detail'][data-detail-kind='must-eat']",
      '(max-width: 767.98px)'
    )
    const layout = readFileSync(modulePath('MapLayout.module.css'), 'utf8')

    expect(mustEatRules).toEqual([
      expect.objectContaining({
        position: 'relative',
        inset: 'auto',
        width: '100%',
        height: '100dvh',
        'min-height': '100dvh',
        'margin-top': '-100dvh',
        overflow: 'hidden',
      }),
    ])
    expect(layout).not.toContain(
      "html:has(.shell [data-map-sheet][data-detail-kind='must-eat'])"
    )
  })

  it('restores the phone map layer before paint when a detail closes', () => {
    const section = readFileSync(fileURLToPath(new URL('../MapSection.tsx', import.meta.url)), 'utf8')
    const visibilityWrite = section.indexOf("mapWrap.style.visibility = 'hidden'")
    const layoutEffect = section.lastIndexOf('useLayoutEffect(() => {', visibilityWrite)
    const passiveEffect = section.lastIndexOf('useEffect(() => {', visibilityWrite)

    expect(visibilityWrite).toBeGreaterThan(-1)
    expect(layoutEffect).toBeGreaterThan(passiveEffect)
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
