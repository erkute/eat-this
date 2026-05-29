import { describe, it, expect } from 'vitest'
import { render } from '@react-email/render'
import MagicLinkEmail from '../MagicLinkEmail'

const props = { magicLink: 'https://x/verify?abc=1', appUrl: 'https://www.eatthisdot.com' }

describe('MagicLinkEmail', () => {
  it('renders the new brand assets, link and CTA', async () => {
    const html = await render(MagicLinkEmail(props))
    expect(html).toContain('/pics/eat-this-logo.webp')
    expect(html).toContain('/pics/slogan.webp')
    expect(html).toContain('/pics/booster/booster_free.webp')
    expect(html).toContain('https://x/verify?abc=1')
    expect(html).toContain('Anmelden')
  })

  it('drops all retired onboarding-script content', async () => {
    const html = await render(MagicLinkEmail(props))
    for (const s of ['Pack öffnen', 'Booster Pack wartet', 'enthüllt', 'Sag uns deinen Namen', 'So geht', 'char1.png', 'logo2-white']) {
      expect(html).not.toContain(s)
    }
  })
})
