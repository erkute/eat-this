import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss, { type AtRule, type Rule } from 'postcss'
import { describe, expect, it } from 'vitest'

const cssPath = fileURLToPath(new URL('./MapDetails.module.css', import.meta.url))
const root = postcss.parse(readFileSync(cssPath, 'utf8'), { from: cssPath })

function isInside(rule: Rule, name: string, params: string) {
  for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type === 'atrule' && parent.name === name && parent.params === params) return true
  }
  return false
}

function hasAnimationNone(selectorPart: string) {
  let found = false
  root.walkRules((rule) => {
    if (
      isInside(rule, 'media', '(prefers-reduced-motion: reduce)')
      && rule.selector.includes(selectorPart)
      && rule.nodes.some((node) => node.type === 'decl' && node.prop === 'animation' && node.value === 'none')
    ) {
      found = true
    }
  })
  return found
}

describe('MapDetails CSS contracts', () => {
  it('keeps the module free of !important and global html/body prefixes', () => {
    const important: string[] = []
    const prefixed: string[] = []

    root.walkDecls((declaration) => {
      if (declaration.important) important.push(`${declaration.prop}: ${declaration.value}`)
    })
    root.walkRules((rule) => {
      if (rule.parent?.type === 'atrule' && /(?:^|-)keyframes$/i.test(rule.parent.name)) return
      for (const selector of postcss.list.comma(rule.selector)) {
        if (/^(?:html|body)\s/.test(selector)) prefixed.push(selector)
      }
    })

    expect(important).toEqual([])
    expect(prefixed).toEqual([])
  })

  it('defines and references every detail animation exactly once', () => {
    const expected = [
      'mustEatTapShake',
      'fdCardWiggle',
      'rdSkelShimmer',
      'fdNameMagicReveal',
      'fdNameMagicSweep',
      'fdRevealReadyShake',
    ]
    const definitions = new Map<string, number>()
    const references = new Map<string, number>()

    root.walkAtRules((atRule: AtRule) => {
      if (/(?:^|-)keyframes$/i.test(atRule.name)) {
        definitions.set(atRule.params, (definitions.get(atRule.params) ?? 0) + 1)
      }
    })
    root.walkDecls((declaration) => {
      if (!declaration.prop.startsWith('animation')) return
      for (const name of expected) {
        if (declaration.value.includes(name)) references.set(name, (references.get(name) ?? 0) + 1)
      }
    })

    for (const name of expected) {
      expect(definitions.get(name), `${name} definition`).toBe(1)
      expect(references.get(name), `${name} reference`).toBeGreaterThan(0)
    }
  })

  it('disables every continuous or triggered detail animation for reduced motion', () => {
    expect(hasAnimationNone('.fdHeroLocked')).toBe(true)
    expect(hasAnimationNone('.fdHeroLocked.mustEatCardTapping')).toBe(true)
    expect(hasAnimationNone('.fdHeroLocked.mustEatCardCanUnlock')).toBe(true)
    expect(hasAnimationNone('.fdNameText.fdNameUnblurring')).toBe(true)
    expect(hasAnimationNone('.fdNameText.fdNameUnblurring::after')).toBe(true)
    expect(hasAnimationNone('.rdBodySkel span')).toBe(true)
  })

  it('retains the responsive and Safari detail contracts', () => {
    const media = new Set<string>()
    const supports = new Set<string>()
    root.walkAtRules((atRule) => {
      if (atRule.name === 'media') media.add(atRule.params)
      if (atRule.name === 'supports') supports.add(atRule.params)
    })

    const expectedMedia = [
      '(max-width: 767.98px)',
      '(min-width: 700px) and (max-width: 1023.98px)',
      '(min-width: 1024px) and (max-height: 760px)',
      '(max-width: 380px), (max-height: 740px)',
    ]
    for (const query of expectedMedia) expect(media.has(query), query).toBe(true)
    expect(supports.has('(-webkit-touch-callout: none)')).toBe(true)
  })
})
