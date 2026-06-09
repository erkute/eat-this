import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BuddyAvatarFallback } from './BuddyAvatar'

describe('BuddyAvatarFallback', () => {
  it('marks the mood on the wrapper', () => {
    const html = renderToStaticMarkup(<BuddyAvatarFallback mood="talking" />)
    expect(html).toMatch(/data-mood="talking"/)
  })
  it('swaps the base frame per mood', () => {
    const thinking = renderToStaticMarkup(<BuddyAvatarFallback mood="thinking" />)
    expect(thinking).toMatch(/buddy-think\.webp/)
    const happy = renderToStaticMarkup(<BuddyAvatarFallback mood="happy" />)
    expect(happy).toMatch(/buddy-laugh\.webp/)
    const idle = renderToStaticMarkup(<BuddyAvatarFallback mood="idle" />)
    expect(idle).toMatch(/buddy\.webp/)
  })
})
