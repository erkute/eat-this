// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { postLoginRedirect } from '../postLoginRedirect'

function makeRouter() {
  return { replace: vi.fn(), push: vi.fn() }
}

describe('postLoginRedirect', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('routes to the home hub / (default locale)', async () => {
    const router = makeRouter()
    await postLoginRedirect('u1', router as never, 'de')
    expect(router.replace).toHaveBeenCalledWith('/')
  })

  it('prefixes /en for non-default locale', async () => {
    const router = makeRouter()
    await postLoginRedirect('u1', router as never, 'en')
    expect(router.replace).toHaveBeenCalledWith('/en')
  })
})
