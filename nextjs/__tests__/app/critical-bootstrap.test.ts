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
})
