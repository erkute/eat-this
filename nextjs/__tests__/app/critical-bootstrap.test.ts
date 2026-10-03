import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('critical auth bootstrap', () => {
  // Die Bezirksseite steht auf Weiss (Heftlook), der Index /bezirk auf Ink —
  // globals.css unterscheidet sie am Seitennamen. Bootstrap und SiteNav
  // müssen ihn gleich vergeben, sonst blitzt beim Laden der falsche Grund.
  it('names a district page apart from the district index, like SiteNav', () => {
    const layout = readFileSync(join(process.cwd(), 'app/[locale]/layout.tsx'), 'utf8')
    const nav = readFileSync(join(process.cwd(), 'app/components/SiteNav.tsx'), 'utf8')
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')

    expect(layout).toContain("else if(p.indexOf('/bezirk/')===0&&p.length>8)slug='bezirk-detail';")
    expect(nav).toContain("if (path.startsWith('/bezirk/') && path.length > 8) return 'bezirk-detail';")
    expect(css).toMatch(/html\[data-active-page='bezirk-detail'\] \.app-pages \{\s*background: var\(--et-white\);/)
  })

  it('uses the cached auth hint only for a pre-paint flag', () => {
    const source = readFileSync(join(process.cwd(), 'app/[locale]/layout.tsx'), 'utf8')
    const bootstrap = source.match(/const CRITICAL_BOOTSTRAP = `([\s\S]*?)`;/)?.[1]

    expect(bootstrap).toBeDefined()
    expect(bootstrap).toContain("setAttribute('data-auth','1')")
    expect(bootstrap).not.toContain('loginBtn')
    expect(bootstrap).not.toContain('.textContent=')
  })

  // Der Artikel tritt nur auf, wenn er die erste Seite ist: beim Aufklappen
  // aus einem Heft ist das Aufklappen schon der Auftritt (ArticleMotion).
  it('marks a freshly loaded article for its intro, never with reduced motion', () => {
    const source = readFileSync(join(process.cwd(), 'app/[locale]/layout.tsx'), 'utf8')
    const bootstrap = source.match(/const CRITICAL_BOOTSTRAP = `([\s\S]*?)`;/)?.[1] ?? ''
    const line = bootstrap.split('\n').find((l) => l.includes('data-article-intro')) ?? ''

    expect(line).toContain("slug==='news-article'")
    expect(line).toContain("matchMedia('(prefers-reduced-motion: reduce)')")
    // In einem unsichtbaren Tab liefe die Animation nie — der Kopf bliebe leer.
    expect(line).toContain("document.visibilityState==='visible'")
  })

  // Wer den Artikel dunkel gestellt hat, sieht ihn beim Laden gleich dunkel —
  // ohne einen hellen ersten Frame. Gesetzt auf jeder Seite, damit auch ein
  // Artikel, in den man aus der App navigiert, schon dunkel ist.
  it('restores the dark article before the first paint', () => {
    const source = readFileSync(join(process.cwd(), 'app/[locale]/layout.tsx'), 'utf8')
    const bootstrap = source.match(/const CRITICAL_BOOTSTRAP = `([\s\S]*?)`;/)?.[1] ?? ''
    const line = bootstrap.split('\n').find((l) => l.includes('data-article-theme')) ?? ''

    expect(line).toContain("localStorage.getItem('et-article-theme')==='dark'")
    expect(line).toContain("setAttribute('data-article-theme','dark')")
  })

  /* Adobe's kit stylesheet used to be linked here and loaded with media="print"
   * until the bootstrap flipped it. It @imported p.typekit.net/p.css — Adobe's
   * usage beacon — which ran for every visitor before the cookie dialog was
   * answered. The @font-face rules now live in app/globals.css and only the
   * font files are fetched. Do not put a third-party stylesheet back in a head:
   * a stylesheet is a request the visitor never agreed to. */
  // Die 404 bekommt ihre Hülle aus NotFoundAppFrame / SiteChrome – dort stand
  // der Kit-Link bis 26.09.2026 noch, eine Ebene unter app/not-found.tsx.
  it.each([
    'app/[locale]/layout.tsx',
    'app/not-found.tsx',
    'app/components/NotFoundAppFrame.tsx',
    'app/components/SiteChrome.tsx',
  ])('links no third-party stylesheet from %s', (file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8')
    const sheets = source.match(/<link[^>]*rel="stylesheet"[^>]*>/g) ?? []

    expect(sheets.filter((tag) => /https?:\/\//.test(tag))).toEqual([])
    expect(source).not.toContain('typekit.net/kgb1lmh.css')
  })
})
