import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('critical auth bootstrap', () => {
  it('uses the cached auth hint only for a pre-paint flag', () => {
    const source = readFileSync(join(process.cwd(), 'app/[locale]/layout.tsx'), 'utf8')
    const bootstrap = source.match(/const CRITICAL_BOOTSTRAP = `([\s\S]*?)`;/)?.[1]

    expect(bootstrap).toBeDefined()
    expect(bootstrap).toContain("setAttribute('data-auth','1')")
    expect(bootstrap).not.toContain('loginBtn')
    expect(bootstrap).not.toContain('.textContent=')
  })

  /* Adobe's kit stylesheet used to be linked here and loaded with media="print"
   * until the bootstrap flipped it. It @imported p.typekit.net/p.css — Adobe's
   * usage beacon — which ran for every visitor before the cookie dialog was
   * answered. The @font-face rules now live in app/globals.css and only the
   * font files are fetched. Do not put a third-party stylesheet back in a head:
   * a stylesheet is a request the visitor never agreed to. */
  it.each([
    'app/[locale]/layout.tsx',
    'app/not-found.tsx',
    'app/welcome/layout.tsx',
  ])('links no third-party stylesheet from %s', (file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8')
    const sheets = source.match(/<link[^>]*rel="stylesheet"[^>]*>/g) ?? []

    expect(sheets.filter((tag) => /https?:\/\//.test(tag))).toEqual([])
    expect(source).not.toContain('typekit.net/kgb1lmh.css')
  })
})
