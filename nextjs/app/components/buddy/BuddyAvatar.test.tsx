import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BuddyAvatarFallback } from './BuddyAvatar'

describe('BuddyAvatarFallback', () => {
  it('marks the mouth as talking when isTalking is true', () => {
    const html = renderToStaticMarkup(<BuddyAvatarFallback isTalking={true} />)
    expect(html).toMatch(/data-talking="true"/)
  })
  it('marks the mouth as idle when isTalking is false', () => {
    const html = renderToStaticMarkup(<BuddyAvatarFallback isTalking={false} />)
    expect(html).toMatch(/data-talking="false"/)
  })
})
