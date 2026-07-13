import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss, { type Declaration, type Root, type Rule } from 'postcss'
import { describe, expect, it } from 'vitest'

const appDir = fileURLToPath(new URL('./', import.meta.url))
const nextDir = resolve(appDir, '..')
const globalsPath = resolve(appDir, 'globals.css')
const stylePath = resolve(nextDir, 'css/style.css')
const siteNavPath = resolve(appDir, 'components/SiteNav.module.css')
const siteNavComponentPath = resolve(appDir, 'components/SiteNav.tsx')
const siteFooterPath = resolve(appDir, 'components/SiteFooter.tsx')
const loginPath = resolve(appDir, '[locale]/login/login.module.css')

function cssFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return cssFiles(path)
    return entry.name.endsWith('.css') ? [path] : []
  })
}

function sourceName(path: string) {
  return relative(nextDir, path).split(sep).join('/')
}

function normalizedSelector(rule: Rule) {
  return postcss.list.comma(rule.selector).map((selector) => selector.trim().replaceAll(/\s+/g, ' ')).join(', ')
}

function atRuleContext(declaration: Declaration) {
  const context: string[] = []
  for (let parent = declaration.parent?.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type === 'atrule') context.unshift(`@${parent.name} ${parent.params}`.trim())
  }
  return context.join(' > ')
}

function declarationsFor(root: Root, selector: string) {
  const declarations = new Map<string, string[]>()
  root.walkRules((rule) => {
    if (!postcss.list.comma(rule.selector).map((part) => part.trim()).includes(selector)) return
    rule.walkDecls((declaration) => {
      const values = declarations.get(declaration.prop) ?? []
      values.push(declaration.value)
      declarations.set(declaration.prop, values)
    })
  })
  return declarations
}

describe('CSS architecture contracts', () => {
  it('allows !important only for the documented reduced-motion override', () => {
    const important: string[] = []

    for (const path of [...cssFiles(appDir), stylePath]) {
      const root = postcss.parse(readFileSync(path, 'utf8'), { from: path })
      root.walkDecls((declaration) => {
        if (!declaration.important || declaration.parent?.type !== 'rule') return
        important.push([
          sourceName(path),
          atRuleContext(declaration),
          normalizedSelector(declaration.parent),
          `${declaration.prop}: ${declaration.value}`,
        ].join(' | '))
      })
    }

    expect(important.sort()).toEqual([
      'app/globals.css | @media (prefers-reduced-motion: reduce) | *, *::before, *::after | animation-duration: 0.01ms',
      'app/globals.css | @media (prefers-reduced-motion: reduce) | *, *::before, *::after | animation-iteration-count: 1',
      'app/globals.css | @media (prefers-reduced-motion: reduce) | *, *::before, *::after | scroll-behavior: auto',
      'app/globals.css | @media (prefers-reduced-motion: reduce) | *, *::before, *::after | transition-duration: 0.01ms',
    ].sort())
  })

  it('keeps critical first-paint, mobile-Safari and footer contracts intact', () => {
    const root = postcss.parse(readFileSync(globalsPath, 'utf8'), { from: globalsPath })
    const html = declarationsFor(root, 'html')
    const body = declarationsFor(root, 'body')
    const burger = declarationsFor(root, '.burger-drawer:not(.active)')
    const mapOverlay = declarationsFor(root, '.map-spot-overlay:not(.active)')
    const searchOverlay = declarationsFor(root, '.search-overlay:not(.active)')
    const mapPage = declarationsFor(root, ".app-page[data-page='map']")
    const source = root.toString()

    expect(html.get('background-color')).toBeTruthy()
    expect(body.get('background-color')).toBeTruthy()
    expect(burger.get('position')).toContain('fixed')
    expect(burger.get('opacity')).toContain('0')
    expect(burger.get('pointer-events')).toContain('none')
    expect(mapOverlay.get('display')).toContain('none')
    expect(searchOverlay.get('display')).toContain('none')
    expect(mapPage.get('height')).toContain('100dvh')
    expect(source).toContain('100lvh - 100dvh + 80px')

    expect(readFileSync(stylePath, 'utf8')).toContain('.app-page:has([data-site-footer])')
    expect(readFileSync(siteFooterPath, 'utf8')).toContain('data-site-footer')
  })

  it('keeps navigation state local and forbids generated-class substring selectors', () => {
    const legacyNavigationSelectors: string[] = []
    const generatedClassSelectors: string[] = []

    for (const path of [...cssFiles(appDir), stylePath]) {
      const root = postcss.parse(readFileSync(path, 'utf8'), { from: path })
      root.walkRules((rule) => {
        if (rule.selector.includes('[class*=')) generatedClassSelectors.push(`${sourceName(path)}: ${rule.selector}`)
        if (
          (path === globalsPath || path === stylePath)
          && postcss.list.comma(rule.selector).some((selector) => /\.(?:navbar(?:[-_]|\b)|burger-btn\b)/.test(selector))
        ) {
          legacyNavigationSelectors.push(`${sourceName(path)}: ${rule.selector}`)
        }
      })
    }

    const siteNav = readFileSync(siteNavPath, 'utf8')
    const component = readFileSync(siteNavComponentPath, 'utf8')
    expect(generatedClassSelectors).toEqual([])
    expect(legacyNavigationSelectors).toEqual([])
    expect(siteNav).toContain(".nav[data-nav-page='map']")
    expect(siteNav).toContain("data-visibility='hidden'")
    expect(siteNav).toContain("data-visibility='collapsed'")
    expect(component).toContain('data-nav-page={activePage}')
    expect(component).toContain('data-visibility="visible"')
  })

  it('keeps the consolidated login states and removes dead iteration hooks', () => {
    const root = postcss.parse(readFileSync(loginPath, 'utf8'), { from: loginPath })
    const localClasses = new Set<string>()
    root.walkRules((rule) => {
      for (const match of rule.selector.matchAll(/\.([A-Za-z_][\w-]*)/g)) localClasses.add(match[1])
    })

    for (const className of [
      'fieldLabel',
      'kicker',
      'menuWord',
      'modalBenefitNote',
      'modalEyebrow',
      'slogan',
    ]) expect(localClasses.has(className), className).toBe(false)
    expect(declarationsFor(root, '.frameSent').get('--login-accent')).toBeTruthy()
    expect(declarationsFor(root, '.headlineSr').get('position')).toContain('absolute')
    expect(declarationsFor(root, '.fieldLabelSr').get('position')).toContain('absolute')
  })
})
