import { describe, it, expect } from 'vitest'
import { buildMagicLinkText } from '../magicLinkText'

describe('buildMagicLinkText', () => {
  it('contains the link and expiry note', () => {
    const t = buildMagicLinkText('https://x/verify?z=1')
    expect(t).toContain('https://x/verify?z=1')
    expect(t).toContain('1 Stunde gültig')
  })

  it('drops all retired onboarding-script content', () => {
    const t = buildMagicLinkText('https://x/verify')
    for (const s of ['Pack öffnen', 'Booster Pack', '20 zufällige', 'Sag uns deinen Namen', 'So geht']) {
      expect(t).not.toContain(s)
    }
  })
})
